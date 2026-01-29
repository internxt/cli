import { Request, Response } from 'express';
import { WebDavMethodHandler } from '../../types/webdav.types';
import { WebDavUtils } from '../../utils/webdav.utils';
import { TrashService } from '../../services/drive/trash.service';
import { webdavLogger } from '../../utils/logger.utils';
import { NotFoundError } from '../../utils/errors.utils';

export class DELETERequestHandler implements WebDavMethodHandler {
  handle = async (req: Request, res: Response) => {
    const resource = await WebDavUtils.getRequestedResource(req.url);
    webdavLogger.info(`[DELETE] Request received for item at ${resource.url}`);

    const driveItem = await WebDavUtils.getDriveItemFromResource(resource);

    if (!driveItem) {
      throw new NotFoundError(`Resource not found on Internxt Drive at ${resource.url}`);
    }

    webdavLogger.info(`[DELETE] [${driveItem.uuid}] Trashing ${driveItem.itemType}`);
    await TrashService.instance.trashItems({
      items: [{ type: driveItem.itemType, uuid: driveItem.uuid }],
    });

    res.status(204).send();
    const type = driveItem.itemType.charAt(0).toUpperCase() + driveItem.itemType.substring(1);
    webdavLogger.info(`[DELETE] [${driveItem.uuid}] ${type} trashed successfully`);
  };
}
