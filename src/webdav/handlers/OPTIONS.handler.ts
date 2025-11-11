import { WebDavMethodHandler } from '../../types/webdav.types';
import { Request, Response } from 'express';
import { WebDavUtils } from '../../utils/webdav.utils';
import { webdavLogger } from '../../utils/logger.utils';

export class OPTIONSRequestHandler implements WebDavMethodHandler {
  handle = async (req: Request, res: Response) => {
    const resource = await WebDavUtils.getRequestedResource(req.url);

    webdavLogger.info(`[OPTIONS] Request received for ${resource.type} at ${resource.url}`);

    if (resource.url === '/' || resource.url === '') {
      // Root Folder
      const allowedMethods = 'DELETE, GET, HEAD, MKCOL, MOVE, OPTIONS, PROPFIND, PUT';
      webdavLogger.info(`[OPTIONS] Returning Allowed Options: ${allowedMethods}`);
      res.header('Allow', 'DELETE, GET, HEAD, MKCOL, MOVE, OPTIONS, PROPFIND, PUT');
      res.header('DAV', '1, 2, ordered-collections');
      res.status(200).send();
    } else if (resource.type === 'folder') {
      // Children Folder
      const allowedMethods = 'DELETE, HEAD, MKCOL, MOVE, OPTIONS, PROPFIND';
      webdavLogger.info(`[OPTIONS] Returning Allowed Options: ${allowedMethods}`);
      res.header('Allow', allowedMethods);
      res.header('DAV', '1, 2, ordered-collections');
      res.status(200).send();
    } else {
      // Children File
      const allowedMethods = 'DELETE, GET, HEAD, MOVE, OPTIONS, PROPFIND, PUT';
      webdavLogger.info(`[OPTIONS] Returning Allowed Options: ${allowedMethods}`);
      res.header('Allow', allowedMethods);
      res.header('DAV', '1, 2, ordered-collections');
      res.status(200).send();
    }
  };
}
