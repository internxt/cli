import { Request, Response } from 'express';
import { DriveItemRepository } from '../../services/database/drive-item/drive-item.repository';
import { WebDavMethodHandler } from '../../types/webdav.types';
import { WebDavUtils } from '../../utils/webdav.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { NotFoundError } from '../../utils/errors.utils';
import { WebDavFastPathService } from '../../services/webdav/webdav-fast-path.service';

export class DELETERequestHandler implements WebDavMethodHandler {
  handle = async (req: Request, res: Response) => {
    const resource = await WebDavUtils.getRequestedResource(req.url);
    webdavLogger.info(`[DELETE] Request received for item at ${resource.url}`);

    const driveItem = await WebDavFastPathService.instance.getItemFromResource(resource);

    if (!driveItem) {
      throw new NotFoundError(`Resource not found on Internxt Drive at ${resource.url}`);
    }

    await WebDavUtils.deleteOrTrashItem(driveItem);
    await DriveItemRepository.instance.delete([driveItem.uuid]);
    WebDavFastPathService.instance.invalidateResource(resource.url);

    res.status(204).send();
  };
}
