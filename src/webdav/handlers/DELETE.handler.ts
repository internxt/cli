import { Request, Response } from 'express';
import { WebDavMethodHandler } from '../../types/webdav.types';
import { WebDavUtils } from '../../utils/webdav.utils';
import { TrashService } from '../../services/drive/trash.service';
import { webdavLogger } from '../../utils/logger.utils';
import { DriveFileService } from '../../services/drive/drive-file.service';
import { DriveFolderService } from '../../services/drive/drive-folder.service';
import { NotFoundError } from '../../utils/errors.utils';

export class DELETERequestHandler implements WebDavMethodHandler {
  constructor(
    private readonly dependencies: {
      trashService: TrashService;
      driveFileService: DriveFileService;
      driveFolderService: DriveFolderService;
    },
  ) {}

  handle = async (req: Request, res: Response) => {
    const { driveFileService, driveFolderService, trashService } = this.dependencies;
    const resource = await WebDavUtils.getRequestedResource(req);
    webdavLogger.info(`[DELETE] Request received for ${resource.type} at ${resource.url}`);

    const driveItem = await WebDavUtils.getDriveItemFromResource({
      resource,
      driveFolderService,
      driveFileService: driveFileService,
    });

    if (!driveItem) {
      throw new NotFoundError(`Resource not found on Internxt Drive at ${resource.url}`);
    }

    webdavLogger.info(`[DELETE] [${driveItem.uuid}] Trashing ${resource.type}`);
    await trashService.trashItems({
      items: [{ type: resource.type, uuid: driveItem.uuid, id: null }],
    });

    res.status(204).send();
    const type = resource.type.charAt(0).toUpperCase() + resource.type.substring(1);
    webdavLogger.info(`[DELETE] [${driveItem.uuid}] ${type} trashed successfully`);
  };
}
