import { Request, Response } from 'express';
import { DriveFileService } from '../../services/drive/drive-file.service';
import { DriveFolderService } from '../../services/drive/drive-folder.service';
import { WebDavMethodHandler } from '../../types/webdav.types';
import { NotFoundError } from '../../utils/errors.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { WebDavUtils } from '../../utils/webdav.utils';
import { DriveFileItem, DriveFolderItem } from '../../types/drive.types';
import { WebDavFolderService } from '../services/webdav-folder.service';

export class MOVERequestHandler implements WebDavMethodHandler {
  constructor(
    private readonly dependencies: {
      driveFolderService: DriveFolderService;
      driveFileService: DriveFileService;
      webDavFolderService: WebDavFolderService;
    },
  ) {}

  handle = async (req: Request, res: Response) => {
    const { driveFolderService, driveFileService, webDavFolderService } = this.dependencies;
    const resource = await WebDavUtils.getRequestedResource(req);

    webdavLogger.info(`[MOVE] Request received for ${resource.type} at ${resource.url}`);

    const destinationUrl = req.header('destination');
    if (!destinationUrl) {
      throw new NotFoundError('[MOVE] Destination folder not received');
    }
    const destinationPath = WebDavUtils.removeHostFromURL(destinationUrl);
    const destinationResource = await WebDavUtils.getRequestedResource(destinationPath);

    webdavLogger.info('[MOVE] Destination resource found', { destinationResource });

    const originalDriveItem = await WebDavUtils.getDriveItemFromResource({
      resource,
      driveFolderService,
      driveFileService,
    });

    if (!originalDriveItem) {
      throw new NotFoundError(`Resource not found on Internxt Drive at ${resource.url}`);
    }

    const newName = destinationResource.name;

    if (destinationResource.path.dir === resource.path.dir) {
      // RENAME (the operation is from the same dir)
      webdavLogger.info(
        `[MOVE] Renaming ${resource.type} with UUID ${originalDriveItem.uuid} to ${destinationResource.name}`,
      );

      if (resource.type === 'folder') {
        const folder = originalDriveItem as DriveFolderItem;
        await driveFolderService.renameFolder({
          folderUuid: folder.uuid,
          name: newName,
        });
      } else if (resource.type === 'file') {
        const newType = destinationResource.path.ext.replace('.', '');
        const file = originalDriveItem as DriveFileItem;
        await driveFileService.renameFile(file.uuid, {
          plainName: newName,
          type: newType,
        });
      }
    } else {
      // MOVE (the operation is from different dirs)
      webdavLogger.info(`[MOVE] Moving ${resource.type} with UUID ${originalDriveItem.uuid} to ${destinationPath}`);

      const destinationFolderItem =
        (await webDavFolderService.getDriveFolderItemFromPath(destinationResource.parentPath)) ??
        (await webDavFolderService.createParentPathOrThrow(destinationResource.parentPath));

      if (resource.type === 'folder') {
        const folder = originalDriveItem as DriveFolderItem;
        await driveFolderService.moveFolder(folder.uuid, {
          destinationFolder: destinationFolderItem.uuid,
          name: newName,
        });
      } else if (resource.type === 'file') {
        const file = originalDriveItem as DriveFileItem;
        const newType = destinationResource.path.ext.replace('.', '');
        await driveFileService.moveFile(file.uuid, {
          destinationFolder: destinationFolderItem.uuid,
          name: newName,
          type: newType,
        });
      }
    }

    res.status(204).send();
  };
}
