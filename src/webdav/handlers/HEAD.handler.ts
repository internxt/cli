import { Request, Response } from 'express';
import { WebDavMethodHandler } from '../../types/webdav.types';
import { WebDavUtils } from '../../utils/webdav.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { NetworkUtils } from '../../utils/network.utils';
import { NotFoundError } from '../../utils/errors.utils';

export class HEADRequestHandler implements WebDavMethodHandler {
  handle = async (req: Request, res: Response) => {
    const resource = await WebDavUtils.getRequestedResource(req.url);

    webdavLogger.info(`[HEAD] Request received for item at ${resource.url}`);

    const driveItem = await WebDavUtils.getDriveItemFromResource(resource);

    if (!driveItem) {
      throw new NotFoundError(`Resource not found on Internxt Drive at ${resource.url}`);
    }

    webdavLogger.info(`[HEAD] [${driveItem.uuid}] Found Drive item`);

    if (driveItem.itemType === 'file') {
      const range = req.headers['range'];
      const rangeOptions = NetworkUtils.parseRangeHeader({
        range,
        totalFileSize: driveItem.size,
      });
      let contentLength = driveItem.size;
      if (rangeOptions) {
        webdavLogger.info(`[HEAD] [${driveItem.uuid}] Range request received:`, { rangeOptions });
        contentLength = rangeOptions.rangeSize;
      }

      res.header('Content-Type', 'application/octet-stream');
      res.header('Content-length', contentLength.toString());
    }

    res.status(200).send();
  };
}
