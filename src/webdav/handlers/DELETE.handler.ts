import { Request, Response } from 'express';
import { WebDavMethodHandler } from '../../types/webdav.types';
import { WebDavUtils } from '../../utils/webdav.utils';
import { TrashService } from '../../services/drive/trash.service';
import { webdavLogger } from '../../utils/logger.utils';
import { NotFoundError } from '../../utils/errors.utils';
import { ConfigService } from '../../services/config.service';
import { FormatUtils } from '../../utils/format.utils';

export class DELETERequestHandler implements WebDavMethodHandler {
  handle = async (req: Request, res: Response) => {
    const resource = await WebDavUtils.getRequestedResource(req.url);
    webdavLogger.info(`[DELETE] Request received for item at ${resource.url}`);

    const driveItem = await WebDavUtils.getDriveItemFromResource(resource);

    if (!driveItem) {
      throw new NotFoundError(`Resource not found on Internxt Drive at ${resource.url}`);
    }
    const type = FormatUtils.capitalizeFirstLetter(driveItem.itemType);

    const configs = await ConfigService.instance.readWebdavConfig();
    if (configs.deleteFilesPermanently) {
      webdavLogger.info(`[DELETE] [${driveItem.uuid}] Deleting permanently ${driveItem.itemType}`);
      if (driveItem.itemType === 'folder') {
        await TrashService.instance.deleteFolder(driveItem.uuid);
      } else {
        await TrashService.instance.deleteFile(driveItem.uuid);
      }
      webdavLogger.info(`[DELETE] [${driveItem.uuid}] ${type} deleted permanently successfully`);
    } else {
      webdavLogger.info(`[DELETE] [${driveItem.uuid}] Trashing ${driveItem.itemType}`);
      await TrashService.instance.trashItems({
        items: [{ type: driveItem.itemType, uuid: driveItem.uuid }],
      });
      webdavLogger.info(`[DELETE] [${driveItem.uuid}] ${type} trashed successfully`);
    }

    res.status(204).send();
  };
}
