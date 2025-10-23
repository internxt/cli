import { Request, Response } from 'express';
import { DriveFileService } from '../../services/drive/drive-file.service';
import { NetworkFacade } from '../../services/network/network-facade.service';
import { AuthService } from '../../services/auth.service';
import { WebDavMethodHandler } from '../../types/webdav.types';
import { NotFoundError, UnsupportedMediaTypeError } from '../../utils/errors.utils';
import { WebDavUtils } from '../../utils/webdav.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { TrashService } from '../../services/drive/trash.service';
import { EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import { CLIUtils } from '../../utils/cli.utils';
import { BufferStream } from '../../utils/stream.utils';
import { Readable } from 'node:stream';
import { isFileThumbnailable } from '../../utils/thumbnail.utils';
import { ThumbnailService } from '../../services/thumbnail.service';
import { WebDavFolderService } from '../services/webdav-folder.service';
import { AsyncUtils } from '../../utils/async.utils';

export class PUTRequestHandler implements WebDavMethodHandler {
  constructor(
    private readonly dependencies: {
      driveFileService: DriveFileService;
      webDavFolderService: WebDavFolderService;
      trashService: TrashService;
      authService: AuthService;
      networkFacade: NetworkFacade;
    },
  ) {}

  handle = async (req: Request, res: Response) => {
    const contentLength = Number(req.headers['content-length']);
    if (!contentLength || isNaN(contentLength) || contentLength <= 0) {
      throw new UnsupportedMediaTypeError('Empty files are not supported');
    }

    const resource = await WebDavUtils.getRequestedResource(req);

    if (resource.type === 'folder') throw new NotFoundError('Folders cannot be created with PUT. Use MKCOL instead.');

    webdavLogger.info(`[PUT] Request received for ${resource.type} at ${resource.url}`);
    webdavLogger.info(`[PUT] Uploading '${resource.name}' to '${resource.parentPath}'`);

    const parentDriveFolderItem =
      (await this.dependencies.webDavFolderService.getDriveFolderItemFromPath(resource.parentPath)) ??
      (await this.dependencies.webDavFolderService.createParentPathOrThrow(resource.parentPath));
    try {
      // If the file already exists, the WebDAV specification states that 'PUT /…/file' should replace it.
      // http://www.webdav.org/specs/rfc4918.html#put-resources
      const driveFileItem = await WebDavUtils.getDriveItemFromResource({
        resource: resource,
        driveFileService: this.dependencies.driveFileService,
      });
      if (driveFileItem && driveFileItem.status === 'EXISTS') {
        webdavLogger.info(`[PUT] File '${resource.name}' already exists in '${resource.path.dir}', trashing it...`);
        await this.dependencies.trashService.trashItems({
          items: [{ type: resource.type, uuid: driveFileItem.uuid, id: null }],
        });
      }
    } catch {
      //noop
    }

    const { user } = await this.dependencies.authService.getAuthDetails();

    const fileType = resource.path.ext.replace('.', '');

    const timer = CLIUtils.timer();

    let bufferStream: BufferStream | undefined;
    let fileStream: Readable = req;
    const isThumbnailable = isFileThumbnailable(fileType);
    if (isThumbnailable) {
      bufferStream = new BufferStream();
      fileStream = req.pipe(bufferStream);
    }

    let uploaded = false,
      aborted = false;

    const progressCallback = (progress: number) => {
      if (!uploaded && !aborted) {
        webdavLogger.info(`[PUT] Upload progress for file ${resource.name}: ${(progress * 100).toFixed(2)}%`);
      }
    };

    const fileId = await new Promise((resolve: (fileId: string) => void, reject) => {
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

    webdavLogger.info('[PUT] ✅ File uploaded to network');

    const file = await DriveFileService.instance.createFile({
      plainName: resource.path.name,
      type: fileType,
      size: contentLength,
      folderUuid: parentDriveFolderItem.uuid,
      fileId: fileId,
      bucket: user.bucket,
      encryptVersion: EncryptionVersion.Aes03,
    });

    try {
      if (isThumbnailable && bufferStream) {
        const thumbnailBuffer = bufferStream.getBuffer();

        if (thumbnailBuffer) {
          await ThumbnailService.instance.uploadThumbnail(
            thumbnailBuffer,
            fileType,
            user.bucket,
            file.uuid,
            this.dependencies.networkFacade,
          );
        }
      }
    } catch (error) {
      webdavLogger.info(`[PUT] ❌ File thumbnail upload failed ${(error as Error).message}`);
    }

    const uploadTime = timer.stop();
    webdavLogger.info(`[PUT] ✅ File uploaded in ${uploadTime}ms to Internxt Drive`);

    // Wait for backend search index to propagate (same as folder creation delay in PB-1446)
    await AsyncUtils.sleep(500);

    webdavLogger.info(
      `[PUT] [RESPONSE-201] ${resource.url} - Returning 201 Created after ${uploadTime}ms (+ 500ms propagation delay)`,
    );

    res.status(201).send();
  };
}
