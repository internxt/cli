import { Request, Response } from 'express';
import { WebDavMethodHandler } from '../../types/webdav.types';
import { WebDavUtils } from '../../utils/webdav.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { NetworkUtils } from '../../utils/network.utils';
import { NotFoundError, RangeNotSatisfiableError } from '../../utils/errors.utils';

export class HEADRequestHandler implements WebDavMethodHandler {
  handle = async (req: Request, res: Response) => {
    const resource = await WebDavUtils.getRequestedResource(req.url);

    webdavLogger.info(`[HEAD] Request received for item at ${resource.url}`);

    const driveItem = await WebDavUtils.getDriveItemFromResource(resource);

    if (!driveItem) {
      throw new NotFoundError(`Resource not found on Internxt Drive at ${resource.url}`);
    }

    webdavLogger.info(`[HEAD] [${driveItem.uuid}] Found Drive item`);

    res.header('ETag', WebDavUtils.getItemETag(driveItem));

    let rangeOptions;
    if (driveItem.itemType === 'file') {
      const range = req.headers['range'];
      try {
        rangeOptions = NetworkUtils.parseRangeHeader({
          range,
          totalFileSize: driveItem.size,
        });
      } catch (error) {
        if (error instanceof RangeNotSatisfiableError) {
          res.header('Content-Range', `bytes */${driveItem.size}`);
        }
        throw error;
      }
      let contentLength = driveItem.size;

      res.header('Content-Type', 'application/octet-stream');
      res.header('Accept-Ranges', 'bytes');
      if (rangeOptions) {
        webdavLogger.info(`[HEAD] [${driveItem.uuid}] Range request received:`, { rangeOptions });
        contentLength = rangeOptions.rangeSize;
        res.header('Content-Range', `bytes ${rangeOptions.parsed.start}-${rangeOptions.parsed.end}/${driveItem.size}`);
      }
      res.header('Content-length', contentLength.toString());
    }

    res.status(rangeOptions ? 206 : 200).send();
  };
}
