import { Request, Response } from 'express';
import { WebDavMethodHandler } from '../../types/webdav.types';
import { WebDavUtils } from '../../utils/webdav.utils';
import { DriveDatabaseManager } from '../../services/database/drive-database-manager.service';
import { TrashService } from '../../services/drive/trash.service';
import { webdavLogger } from '../../utils/logger.utils';
import { DriveFileService } from '../../services/drive/drive-file.service';
import { DriveFolderService } from '../../services/drive/drive-folder.service';

export class DELETERequestHandler implements WebDavMethodHandler {
  constructor(
    private readonly dependencies: {
      driveDatabaseManager: DriveDatabaseManager;
      trashService: TrashService;
      driveFileService: DriveFileService;
      driveFolderService: DriveFolderService;
    },
  ) {}

  handle = async (req: Request, res: Response) => {
    const { driveDatabaseManager, driveFileService, driveFolderService, trashService } = this.dependencies;
    const resource = await WebDavUtils.getRequestedResource(req);
    webdavLogger.info(`[DELETE] Request received for ${resource.type} at ${resource.url}`);

    const driveItem = await WebDavUtils.getAndSearchItemFromResource({
      resource,
      driveDatabaseManager,
      driveFolderService,
      driveFileService: driveFileService,
    });

    webdavLogger.info(`[DELETE] [${driveItem.uuid}] Trashing ${resource.type}`);
    await trashService.trashItems({
      items: [{ type: resource.type, uuid: driveItem.uuid }],
    });

    if (resource.type === 'folder') {
      await driveDatabaseManager.deleteFolderById(driveItem.id);
    } else if (resource.type === 'file') {
      await driveDatabaseManager.deleteFileById(driveItem.id);
    }

    res.status(204).send();
    const type = resource.type.charAt(0).toUpperCase() + resource.type.substring(1);
    webdavLogger.info(`[DELETE] [${driveItem.uuid}] ${type} trashed successfully`);
  };
}
