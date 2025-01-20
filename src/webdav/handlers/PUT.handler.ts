import { Request, Response } from 'express';
import { DriveFileService } from '../../services/drive/drive-file.service';
import { NetworkFacade } from '../../services/network/network-facade.service';
import { AuthService } from '../../services/auth.service';
import { WebDavMethodHandler } from '../../types/webdav.types';
import { NotFoundError, UnsupportedMediaTypeError } from '../../utils/errors.utils';
import { WebDavUtils } from '../../utils/webdav.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { DriveDatabaseManager } from '../../services/database/drive-database-manager.service';
import { DriveFileItem, DriveFolderItem } from '../../types/drive.types';
import { DriveFolderService } from '../../services/drive/drive-folder.service';
import { TrashService } from '../../services/drive/trash.service';
import { EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import { CLIUtils } from '../../utils/cli.utils';
import { BufferStream } from '../../utils/stream.utils';
import { Readable } from 'node:stream';
import { isFileThumbnailable } from '../../utils/thumbnail.utils';
import { ThumbnailService } from '../../services/thumbnail.service';

export class PUTRequestHandler implements WebDavMethodHandler {
  constructor(
    private readonly dependencies: {
      driveFileService: DriveFileService;
      driveFolderService: DriveFolderService;
      driveDatabaseManager: DriveDatabaseManager;
      trashService: TrashService;
      authService: AuthService;
      networkFacade: NetworkFacade;
    },
  ) {}

  handle = async (req: Request, res: Response) => {
    const { driveDatabaseManager, authService, networkFacade, driveFileService, driveFolderService, trashService } =
      this.dependencies;
    const contentLength = Number(req.headers['content-length']);
    if (!contentLength || isNaN(contentLength) || contentLength <= 0) {
      throw new UnsupportedMediaTypeError('Empty files are not supported');
    }

    const resource = await WebDavUtils.getRequestedResource(req);

    if (resource.type === 'folder') throw new NotFoundError('Folders cannot be created with PUT. Use MKCOL instead.');

    webdavLogger.info(`[PUT] Request received for ${resource.type} at ${resource.url}`);
    webdavLogger.info(`[PUT] Uploading '${resource.name}' to '${resource.parentPath}'`);

    const parentResource = await WebDavUtils.getRequestedResource(resource.parentPath);

    const parentFolderItem = (await WebDavUtils.getAndSearchItemFromResource({
      resource: parentResource,
      driveDatabaseManager,
      driveFolderService,
    })) as DriveFolderItem;

    try {
      // If the file already exists, the WebDAV specification states that 'PUT /…/file' should replace it.
      // http://www.webdav.org/specs/rfc4918.html#put-resources
      const driveFileItem = (await WebDavUtils.getAndSearchItemFromResource({
        resource: resource,
        driveDatabaseManager,
        driveFileService,
      })) as DriveFileItem;
      if (driveFileItem && driveFileItem.status === 'EXISTS') {
        webdavLogger.info(`[PUT] File '${resource.name}' already exists in '${resource.path.dir}', trashing it...`);
        await driveDatabaseManager.deleteFileById(driveFileItem.id);
        await trashService.trashItems({
          items: [{ type: resource.type, uuid: driveFileItem.uuid }],
        });
      }
    } catch {
      //noop
    }

    const { user } = await authService.getAuthDetails();

    const fileType = resource.path.ext.replace('.', '');

    const timer = CLIUtils.timer();

    let bufferStream: BufferStream | undefined;
    let fileStream: Readable = req;
    const isThumbnailable = isFileThumbnailable(fileType);
    if (isThumbnailable) {
      bufferStream = new BufferStream();
      fileStream = req.pipe(bufferStream);
    }

    const progressCallback = (progress: number) => {
      webdavLogger.info(`[PUT] Upload progress for file ${resource.name}: ${progress * 100}%`);
    };

    let uploaded = false;

    const fileId = await new Promise((resolve: (fileId: string) => void, reject) => {
      networkFacade
        .uploadFile(
          fileStream,
          contentLength,
          user.bucket,
          (err: Error | null, res: string | null) => {
            if (err) {
              return reject(err);
            }
            resolve(res as string);
          },
          progressCallback,
        )
        .then((state) => {
          res.on('close', async () => {
            if (!uploaded) {
              webdavLogger.info('[PUT] ❌ HTTP Client has been disconnected, res has been closed.');
              state.stop();
            }
          });
        });
    });
    uploaded = true;

    webdavLogger.info('[PUT] ✅ File uploaded to network');

    const file = await DriveFileService.instance.createFile({
      plain_name: resource.path.name,
      type: fileType,
      size: contentLength,
      folder_id: parentFolderItem.uuid,
      id: fileId,
      bucket: user.bucket,
      encrypt_version: EncryptionVersion.Aes03,
      name: '',
    });

    try {
      if (isThumbnailable && bufferStream) {
        const thumbnailBuffer = bufferStream.getBuffer();

        if (thumbnailBuffer) {
          await ThumbnailService.instance.uploadThumbnail(
            thumbnailBuffer,
            fileType,
            user.bucket,
            file.id,
            networkFacade,
          );
        }
      }
    } catch (error) {
      webdavLogger.info(`[PUT] ❌ File thumbnail upload failed ${(error as Error).message}`);
    }

    const uploadTime = timer.stop();
    webdavLogger.info(`[PUT] ✅ File uploaded in ${uploadTime}ms to Internxt Drive`);

    await driveDatabaseManager.createFile(file, resource.path.dir + '/');

    res.status(200).send();
  };
}
