import { Request, Response } from 'express';
import { DriveFileService } from '../../services/drive/drive-file.service';
import { NetworkFacade } from '../../services/network/network-facade.service';
import { AuthService } from '../../services/auth.service';
import { WebDavMethodHandler } from '../../types/webdav.types';
import { ConflictError, UnsupportedMediaTypeError } from '../../utils/errors.utils';
import { WebDavUtils } from '../../utils/webdav.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { DriveDatabaseManager } from '../../services/database/drive-database-manager.service';
import { DriveFileItem, DriveFolderItem } from '../../types/drive.types';
import { DriveFolderService } from '../../services/drive/drive-folder.service';
import { TrashService } from '../../services/drive/trash.service';

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
    webdavLogger.info(`PUT request received for uploading file '${resource.name}' to '${resource.parentPath}'`);
    const parentResource = await WebDavUtils.getRequestedResource(resource.parentPath);

    const parentFolderItem = (await WebDavUtils.getAndSearchItemFromResource({
      resource: parentResource,
      driveDatabaseManager,
      driveFolderService,
    })) as DriveFolderItem;

    if (!parentFolderItem) {
      throw new ConflictError(`Parent resource not found for parent path ${resource.parentPath}`);
    }

    try {
      // If the file already exists, the WebDAV specification states that 'PUT /…/file' should replace it.
      // http://www.webdav.org/specs/rfc4918.html#put-resources
      const driveFileItem = (await WebDavUtils.getAndSearchItemFromResource({
        resource: resource,
        driveDatabaseManager,
        driveFileService,
      })) as DriveFileItem;
      if (driveFileItem && driveFileItem.status === 'EXISTS') {
        webdavLogger.info(`File '${resource.name}' already exists in '${resource.path.dir}', trashing it before PUT`);
        await driveDatabaseManager.deleteFileById(driveFileItem.id);
        await trashService.trashItems({
          items: [{ type: resource.type, uuid: driveFileItem.uuid }],
        });
      }
    } catch {
      //noop
    }

    const { user, mnemonic } = await authService.getAuthDetails();

    const [uploadPromise] = await networkFacade.uploadFromStream(user.bucket, mnemonic, contentLength, req, {
      progressCallback: (progress) => {
        webdavLogger.info(`Upload progress for file ${resource.name}: ${(100 * progress).toFixed(2)}%`);
      },
    });

    const uploadResult = await uploadPromise;

    webdavLogger.info('✅ File uploaded to network');

    const file = await DriveFileService.instance.createFile({
      name: resource.path.name,
      type: resource.path.ext.replaceAll('.', ''),
      size: contentLength,
      folderId: parentFolderItem.id,
      fileId: uploadResult.fileId,
      bucket: user.bucket,
    });

    webdavLogger.info('✅ File uploaded to internxt drive');

    await driveDatabaseManager.createFile(file, resource.path.dir + '/');

    res.status(200).send();
  };
}
