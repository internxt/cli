import { RequestHandler } from 'express';
import { webdavLogger } from '../../utils/logger.utils';

type RequestLoggerConfig = {
  methods?: string[];
};
export const RequestLoggerMiddleware = (config: RequestLoggerConfig): RequestHandler => {
  return (req, _, next) => {
    if (config.methods && !config.methods.includes(req.method)) return next();
    webdavLogger.info(
      `WebDav request received\nMethod: ${req.method}\nURL: ${req.url}\nBody: ${req.body}\nHeaders: ${JSON.stringify(req.headers)}`,
    );
    next();
  };
};
