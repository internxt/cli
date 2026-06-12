import { Request, Response } from 'express';
import { DriveFileService } from '../../services/drive/drive-file.service';
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

export class PUTRequestHandler implements WebDavMethodHandler {
  handle = async (req: Request, res: Response) => {
    let contentLength = Number(req.headers['content-length']);
    if (!contentLength || Number.isNaN(contentLength) || contentLength <= 0) {
      contentLength = 0;
    }

    await UploadUtils.checkUploadSizeLimits(contentLength);

    const resource = await WebDavUtils.getRequestedResource(req.url);
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
      (await WebDavFolderService.instance.getDriveFolderItemFromPath(resource.parentPath)) ??
      (await WebDavFolderService.instance.createParentPathOrThrow(resource.parentPath));

    // If the file already exists, the WebDAV specification states that 'PUT /…/file' should replace it.
    // http://www.webdav.org/specs/rfc4918.html#put-resources
    const driveFileItem = await WebDavUtils.getDriveItemFromResource(resource);
    if (driveFileItem && driveFileItem.status === 'EXISTS') {
      if (driveFileItem.itemType === 'folder') {
        webdavLogger.info('[PUT] ❌ A folder exists on the cloud with the same name.');
        throw new ConflictError('A folder exists on the cloud with the same name');
      }
      webdavLogger.info(
        `[PUT] File '${resource.name}' already exists in '${resource.path.dir}', it will be replaced...`,
      );
      try {
        await WebDavUtils.deleteOrTrashItem(driveFileItem);
      } catch {
        //noop
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
    const file = await DriveFileService.instance.createFile({
      plainName: resource.path.name,
      type: fileType,
      size: contentLength,
      folderUuid: parentDriveFolderItem.uuid,
      fileId,
      bucket,
      encryptVersion: EncryptionVersion.Aes03,
    });
    timings.driveUpload = driveTimer.stop();

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

    webdavLogger.info(
      `[PUT] [RESPONSE-201] ${resource.url} - Returning 201 Created after ${CLIUtils.formatDuration(totalTime)}`,
    );

    res.status(201).send();
  };
}
