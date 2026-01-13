import { Request, Response } from 'express';
import { DriveFileService } from '../../services/drive/drive-file.service';
import { NetworkFacade } from '../../services/network/network-facade.service';
import { AuthService } from '../../services/auth.service';
import { WebDavMethodHandler } from '../../types/webdav.types';
import { NotFoundError } from '../../utils/errors.utils';
import { WebDavUtils } from '../../utils/webdav.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { TrashService } from '../../services/drive/trash.service';
import { EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import { CLIUtils } from '../../utils/cli.utils';
import { BufferStream } from '../../utils/stream.utils';
import { Readable } from 'node:stream';
import { isFileThumbnailable, tryUploadThumbnail } from '../../utils/thumbnail.utils';
import { WebDavFolderService } from '../services/webdav-folder.service';
import { AsyncUtils } from '../../utils/async.utils';
import { DriveFolderService } from '../../services/drive/drive-folder.service';

export class PUTRequestHandler implements WebDavMethodHandler {
  constructor(
    private readonly dependencies: {
      driveFileService: DriveFileService;
      driveFolderService: DriveFolderService;
      webDavFolderService: WebDavFolderService;
      trashService: TrashService;
      authService: AuthService;
      networkFacade: NetworkFacade;
    },
  ) {}

  handle = async (req: Request, res: Response) => {
    let contentLength = Number(req.headers['content-length']);
    if (!contentLength || Number.isNaN(contentLength) || contentLength <= 0) {
      contentLength = 0;
    }

    const resource = await WebDavUtils.getRequestedResource(req.url);

    // If the file already exists, the WebDAV specification states that 'PUT /…/file' should replace it.
    // http://www.webdav.org/specs/rfc4918.html#put-resources
    const driveFileItem = await WebDavUtils.getDriveItemFromResource({
      resource: resource,
      driveFileService: this.dependencies.driveFileService,
      driveFolderService: this.dependencies.driveFolderService,
    });
    if (driveFileItem?.itemType === 'folder') {
      throw new NotFoundError('Folders cannot be created with PUT. Use MKCOL instead.');
    }
    webdavLogger.info(`[PUT] Request received for file at ${resource.url}`);
    webdavLogger.info(
      `[PUT] Uploading '${resource.name}' (${CLIUtils.formatBytesToString(contentLength)}) to '${resource.parentPath}'`,
    );

    const timings = {
      networkUpload: 0,
      driveUpload: 0,
      thumbnailUpload: 0,
    };

    const parentDriveFolderItem =
      (await this.dependencies.webDavFolderService.getDriveFolderItemFromPath(resource.parentPath)) ??
      (await this.dependencies.webDavFolderService.createParentPathOrThrow(resource.parentPath));

    try {
      if (driveFileItem && driveFileItem.status === 'EXISTS') {
        webdavLogger.info(`[PUT] File '${resource.name}' already exists in '${resource.path.dir}', trashing it...`);
        await this.dependencies.trashService.trashItems({
          items: [{ type: driveFileItem.itemType, uuid: driveFileItem.uuid }],
        });
      }
    } catch {
      //noop
    }

    const { user } = await this.dependencies.authService.getAuthDetails();

    const fileType = resource.path.ext.replace('.', '');

    let bufferStream: BufferStream | undefined;
    let fileStream: Readable = req;
    const isThumbnailable = isFileThumbnailable(fileType);
    if (isThumbnailable) {
      bufferStream = new BufferStream();
      fileStream = req.pipe(bufferStream);
    }

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
      fileId = await new Promise((resolve: (fileId: string) => void, reject) => {
        const state = this.dependencies.networkFacade.uploadFile(
          fileStream,
          contentLength,
          user.bucket,
          (err: Error | null, res: string | null) => {
            if (err) {
              aborted = true;
              return reject(err);
            }
            resolve(res as string);
          },
          progressCallback,
        );
        res.on('close', async () => {
          aborted = true;
          if (!uploaded) {
            webdavLogger.info('[PUT] ❌ HTTP Client has been disconnected, res has been closed.');
            state.stop();
          }
        });
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
      fileId: fileId,
      bucket: user.bucket,
      encryptVersion: EncryptionVersion.Aes03,
    });
    timings.driveUpload = driveTimer.stop();

    const thumbnailTimer = CLIUtils.timer();
    if (contentLength > 0 && isThumbnailable && bufferStream) {
      void tryUploadThumbnail({
        bufferStream,
        fileType,
        userBucket: user.bucket,
        fileUuid: file.uuid,
        networkFacade: this.dependencies.networkFacade,
      });
    }
    timings.thumbnailUpload = thumbnailTimer.stop();

    const totalTime = Object.values(timings).reduce((sum, time) => sum + time, 0);
    const throughputMBps = CLIUtils.calculateThroughputMBps(contentLength, timings.networkUpload);

    webdavLogger.info(`[PUT] ✅ File uploaded in ${CLIUtils.formatDuration(totalTime)} to Internxt Drive`);

    webdavLogger.info(
      `[PUT] Timing breakdown:\n
      Network upload: ${CLIUtils.formatDuration(timings.networkUpload)} (${throughputMBps.toFixed(2)} MB/s)\n
      Drive upload: ${CLIUtils.formatDuration(timings.driveUpload)}\n
      Thumbnail: ${CLIUtils.formatDuration(timings.thumbnailUpload)}\n`,
    );

    // Wait for backend search index to propagate (same as folder creation delay in PB-1446)
    await AsyncUtils.sleep(500);

    webdavLogger.info(
      `[PUT] [RESPONSE-201] ${resource.url} - Returning 201 Created after ${CLIUtils.formatDuration(totalTime)}`,
    );

    res.status(201).send();
  };
}
