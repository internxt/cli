import { Request, Response } from 'express';
import { DriveDatabaseManager } from '../../services/database/drive-database-manager.service';
import { DriveFileService } from '../../services/drive/drive-file.service';
import { DriveFolderService } from '../../services/drive/drive-folder.service';
import { WebDavMethodHandler } from '../../types/webdav.types';
import { ConflictError, NotFoundError } from '../../utils/errors.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { WebDavUtils } from '../../utils/webdav.utils';
import { DriveFileItem, DriveFolderItem } from '../../types/drive.types';

export class MOVERequestHandler implements WebDavMethodHandler {
  constructor(
    private dependencies: {
      driveDatabaseManager: DriveDatabaseManager;
      driveFolderService: DriveFolderService;
      driveFileService: DriveFileService;
    },
  ) {}

  handle = async (req: Request, res: Response) => {
    const { driveDatabaseManager, driveFolderService, driveFileService } = this.dependencies;
    const resource = await WebDavUtils.getRequestedResource(req);

    webdavLogger.info('[MOVE] Resource found', { resource });

    const destinationUrl = req.header('destination');
    if (!destinationUrl) {
      throw new NotFoundError('Destination folder not received');
    }
    const destinationPath = WebDavUtils.removeHostFromURL(destinationUrl);
    const destinationResource = await WebDavUtils.getRequestedResource(destinationPath);

    webdavLogger.info('[MOVE] Destination resource found', { destinationResource });

    const originalDriveItem = await WebDavUtils.getAndSearchItemFromResource({
      resource,
      driveDatabaseManager,
      driveFolderService,
      driveFileService,
    });

    if (destinationResource.path.dir === resource.path.dir) {
      // RENAME (the operation is from the same dir)
      webdavLogger.info(
        `[MOVE] Renaming ${resource.type} with UUID ${originalDriveItem.uuid} to ${destinationResource.name}`,
      );
      const newName = destinationResource.name;

      if (resource.type === 'folder') {
        const folder = originalDriveItem as DriveFolderItem;
        await driveFolderService.renameFolder({
          folderUuid: folder.uuid,
          name: newName,
        });
        await driveDatabaseManager.createFolder(folder, destinationResource.url);
      } else if (resource.type === 'file') {
        const newType = destinationResource.path.ext.trim().length > 0 ? destinationResource.path.ext : null;
        const file = originalDriveItem as DriveFileItem;
        await driveFileService.renameFile(file.uuid, {
          plainName: newName,
          type: newType,
        });
        await driveDatabaseManager.createFile(file, destinationResource.url);
      }
    } else {
      // MOVE (the operation is from different dirs)
      webdavLogger.info(`[MOVE] Moving ${resource.type} with UUID ${originalDriveItem.uuid} to ${destinationPath}`);
      const destinationFolderResource = await WebDavUtils.getRequestedResource(destinationResource.parentPath);

      const destinationFolderItem = (await WebDavUtils.getAndSearchItemFromResource({
        resource: destinationFolderResource,
        driveDatabaseManager,
        driveFolderService,
      })) as DriveFolderItem;
      if (!destinationFolderItem) {
        throw new ConflictError(`Destination folder resource not found for path ${destinationResource.parentPath}`);
      }

      if (resource.type === 'folder') {
        const folder = originalDriveItem as DriveFolderItem;
        await driveFolderService.moveFolder({
          folderUuid: folder.uuid,
          destinationFolderUuid: destinationFolderItem.uuid,
        });
        await driveDatabaseManager.createFolder(folder, destinationPath);
      } else if (resource.type === 'file') {
        const file = originalDriveItem as DriveFileItem;
        await driveFileService.moveFile({
          fileUuid: file.uuid,
          destinationFolderUuid: destinationFolderItem.uuid,
        });
        await driveDatabaseManager.createFile(file, destinationPath);
      }
    }

    res.status(204).send();
  };
}
