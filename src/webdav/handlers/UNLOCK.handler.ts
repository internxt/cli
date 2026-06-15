import { Request, Response } from 'express';
import { WebDavMethodHandler } from '../../types/webdav.types';
import { webdavLogger } from '../../utils/logger.utils';

export class UNLOCKRequestHandler implements WebDavMethodHandler {
  handle = async (req: Request, res: Response) => {
    const lockToken = req.headers['lock-token'] ?? 'unknown';

    webdavLogger.info(`[UNLOCK] Released lock ${lockToken} for ${req.url}`);

    res.status(204).send();
  };
}
