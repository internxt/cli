import { Request, Response } from 'express';
import { DriveFileService } from '../../services/drive/drive-file.service';
import { DriveFolderService } from '../../services/drive/drive-folder.service';
import { WebDavMethodHandler } from '../../types/webdav.types';
import { NotFoundError } from '../../utils/errors.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { WebDavUtils } from '../../utils/webdav.utils';
import { WebDavFolderService } from '../services/webdav-folder.service';

export class MOVERequestHandler implements WebDavMethodHandler {
  handle = async (req: Request, res: Response) => {
    const resource = await WebDavUtils.getRequestedResource(req.url);

    webdavLogger.info(`[MOVE] Request received for item at ${resource.url}`);

    const destinationUrl = req.header('destination');
    if (!destinationUrl) {
      throw new NotFoundError('[MOVE] Destination folder not received');
    }
    const destinationPath = WebDavUtils.removeHostFromURL(destinationUrl);
    const destinationResource = await WebDavUtils.getRequestedResource(destinationPath);

    webdavLogger.info('[MOVE] Destination resource found', { destinationResource });

    const originalDriveItem = await WebDavUtils.getDriveItemFromResource(resource);

    if (!originalDriveItem) {
      throw new NotFoundError(`Resource not found on Internxt Drive at ${resource.url}`);
    }

    if (destinationResource.path.dir === resource.path.dir) {
      // RENAME (the operation is from the same dir)
      webdavLogger.info(
        `[MOVE] Renaming ${originalDriveItem.itemType}
        with UUID ${originalDriveItem.uuid} to ${destinationResource.name}`,
      );

      if (originalDriveItem.itemType === 'folder') {
        const folder = originalDriveItem;
        await DriveFolderService.instance.renameFolder({
          folderUuid: folder.uuid,
          name: destinationResource.name,
        });
      } else if (originalDriveItem.itemType === 'file') {
        const file = originalDriveItem;
        const plainName = destinationResource.path.name;
        const fileType = destinationResource.path.ext.replace('.', '');
        await DriveFileService.instance.renameFile(file.uuid, {
          plainName: plainName,
          type: fileType,
        });
      }
    } else {
      // MOVE (the operation is from different dirs)
      webdavLogger.info(
        `[MOVE] Moving ${originalDriveItem.itemType} with UUID ${originalDriveItem.uuid} to ${destinationPath}`,
      );

      const destinationFolderItem =
        (await WebDavFolderService.instance.getDriveFolderItemFromPath(destinationResource.parentPath)) ??
        (await WebDavFolderService.instance.createParentPathOrThrow(destinationResource.parentPath));

      if (originalDriveItem.itemType === 'folder') {
        const folder = originalDriveItem;
        await DriveFolderService.instance.moveFolder(folder.uuid, {
          destinationFolder: destinationFolderItem.uuid,
          name: destinationResource.name,
        });
      } else if (originalDriveItem.itemType === 'file') {
        const file = originalDriveItem;
        const plainName = destinationResource.path.name;
        const fileType = destinationResource.path.ext.replace('.', '');
        await DriveFileService.instance.moveFile(file.uuid, {
          destinationFolder: destinationFolderItem.uuid,
          name: plainName,
          type: fileType,
        });
      }
    }

    res.status(204).send();
  };
}
