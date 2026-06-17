import { Request, Response } from 'express';
import { DriveFileService } from '../../services/drive/drive-file.service';
import { DriveItemRepository } from '../../services/database/drive-item/drive-item.repository';
import { AuthService } from '../../services/auth.service';
import { WebDavMethodHandler } from '../../types/webdav.types';
import { ConflictError } from '../../utils/errors.utils';
import { WebDavUtils } from '../../utils/webdav.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import { CLIUtils } from '../../utils/cli.utils';
import { WebDavFolderService } from '../../services/webdav/webdav-folder.service';
import { ThumbnailService } from '../../services/thumbnail.service';
import { FormatUtils } from '../../utils/format.utils';
import { UploadUtils } from '../../utils/upload.utils';
import { WebDavFastPathService } from '../../services/webdav/webdav-fast-path.service';

export class PUTRequestHandler implements WebDavMethodHandler {
  private readonly isHyperBackupZeroBytePlaceholder = (
    resource: Awaited<ReturnType<typeof WebDavUtils.getRequestedResource>>,
    contentLength: number,
    hyperBackupMode: boolean,
  ): boolean => {
    if (!hyperBackupMode || contentLength !== 0) return false;

    return /\/Pool\/.+\/[^/]+\.(bucket|index)\.\d+$/.test(resource.url);
  };

  handle = async (req: Request, res: Response) => {
    let contentLength = Number(req.headers['content-length']);
    if (!contentLength || Number.isNaN(contentLength) || contentLength <= 0) {
      contentLength = 0;
    }

    await UploadUtils.checkUploadSizeLimits(contentLength);

    const resource = await WebDavUtils.getRequestedResource(req.url);
    const hyperBackupMode = await WebDavFastPathService.instance.isEnabled();

    if (this.isHyperBackupZeroBytePlaceholder(resource, contentLength, hyperBackupMode)) {
      webdavLogger.info(
        `[PUT] Hyper Backup zero-byte placeholder acknowledged without Internxt upload: ${resource.url}`,
      );
      res.status(201).send();
      return;
    }

    webdavLogger.info(`[PUT] Request received for file at ${resource.url}`);
    webdavLogger.info(
      `[PUT] Uploading '${resource.name}' (${FormatUtils.humanFileSize(contentLength)}) to '${resource.parentPath}'`,
    );

    const timings = {
      networkUpload: 0,
      driveUpload: 0,
      thumbnailUpload: 0,
    };

    const parentDriveFolderItem =
      (hyperBackupMode
        ? await WebDavFastPathService.instance.getFolderFromPath(resource.parentPath)
        : await WebDavFolderService.instance.getDriveFolderItemFromPath(resource.parentPath)) ??
      (await WebDavFolderService.instance.createParentPathOrThrow(resource.parentPath));

    let isReplacement = false;

    // If the file already exists, the WebDAV specification states that 'PUT /…/file' should replace it.
    // http://www.webdav.org/specs/rfc4918.html#put-resources
    const driveFileItem = await WebDavFastPathService.instance.getItemFromResource(resource);
    if (driveFileItem && driveFileItem.status === 'EXISTS') {
      if (driveFileItem.itemType === 'folder') {
        webdavLogger.info('[PUT] ❌ A folder exists on the cloud with the same name.');
        throw new ConflictError('A folder exists on the cloud with the same name');
      }
      isReplacement = true;
      webdavLogger.info(
        `[PUT] File '${resource.name}' already exists in '${resource.path.dir}', it will be replaced...`,
      );
      if (!hyperBackupMode) {
        try {
          await WebDavUtils.deleteOrTrashItem(driveFileItem);
          await DriveItemRepository.instance.delete([driveFileItem.uuid]);
        } catch {
          // noop
        }
      }
    }

    const { user } = await AuthService.instance.getAuthDetails();
    const fileType = resource.path.ext.replace('.', '');

    const { fileStream, thumbnailStream } = UploadUtils.prepareUploadStreams(req, fileType);

    const { networkFacade, bucket } = await CLIUtils.prepareNetwork(user);

    let fileId: string | undefined;

    if (contentLength > 0) {
      let uploaded = false,
        aborted = false;

      const progressCallback = (progress: number) => {
        if (!uploaded && !aborted) {
          webdavLogger.info(`[PUT] Upload progress for file ${resource.name}: ${(progress * 100).toFixed(2)}%`);
        }
      };

      const networkUploadTimer = CLIUtils.timer();
      const abortable = new AbortController();

      fileId = await networkFacade.uploadFile({
        from: fileStream,
        size: contentLength,
        bucketId: bucket,
        progressCallback,
        abortSignal: abortable.signal,
      });

      res.on('close', async () => {
        aborted = true;
        if (!uploaded) {
          webdavLogger.info('[PUT] ❌ HTTP Client has been disconnected, res has been closed.');
          abortable.abort();
        }
      });
      uploaded = true;
      timings.networkUpload = networkUploadTimer.stop();

      webdavLogger.info('[PUT] ✅ File uploaded to network');
    }

    const driveTimer = CLIUtils.timer();
    const filePayload = {
      plainName: resource.path.name,
      type: fileType,
      size: contentLength,
      folderUuid: parentDriveFolderItem.uuid,
      fileId,
      bucket,
      encryptVersion: EncryptionVersion.Aes03,
    };

    let file;
    if (hyperBackupMode && driveFileItem?.itemType === 'file' && contentLength > 0) {
      try {
        file = await DriveFileService.instance.replaceFile(driveFileItem.uuid, filePayload);
      } catch (error) {
        webdavLogger.warn(
          `[PUT] Fast replace failed for '${resource.url}', falling back to delete and create: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        await WebDavUtils.deleteOrTrashItem(driveFileItem);
        await DriveItemRepository.instance.delete([driveFileItem.uuid]);
        file = await DriveFileService.instance.createFile(filePayload);
      }
    } else {
      if (hyperBackupMode && driveFileItem?.itemType === 'file') {
        await WebDavUtils.deleteOrTrashItem(driveFileItem);
        await DriveItemRepository.instance.delete([driveFileItem.uuid]);
      }
      file = await DriveFileService.instance.createFile(filePayload);
    }
    timings.driveUpload = driveTimer.stop();
    WebDavFastPathService.instance.registerCreatedFile(resource.url, file);

    await DriveItemRepository.instance.createOrUpdate([
      {
        uuid: file.uuid,
        path: resource.url,
        type: 'file',
        createdAt: file.createdAt,
        updatedAt: new Date(),
      },
    ]);

    const thumbnailTimer = CLIUtils.timer();
    await ThumbnailService.instance.tryUploadThumbnail({
      fileUuid: file.uuid,
      bufferStream: thumbnailStream,
      fileType,
      bucket,
      networkFacade,
      size: contentLength,
    });
    timings.thumbnailUpload = thumbnailTimer.stop();

    const { totalTime, timingBreakdown } = UploadUtils.getTimings(contentLength, timings);

    webdavLogger.info(
      `[PUT] ✅ File uploaded in ${CLIUtils.formatDuration(totalTime)} to Internxt Drive\n` +
        '[PUT] Timing breakdown:\n' +
        timingBreakdown,
    );

    const statusCode = isReplacement ? 204 : 201;
    webdavLogger.info(
      `[PUT] [RESPONSE-${statusCode}] ${resource.url} - Returning ${statusCode} ` +
        `after ${CLIUtils.formatDuration(totalTime)}`,
    );

    res.status(statusCode).send();
  };
}
