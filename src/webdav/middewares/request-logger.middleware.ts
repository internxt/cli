import { RequestHandler } from 'express';
import { webdavLogger } from '../../utils/logger.utils';

type RequestLoggerConfig = {
  enable: boolean;
  methods?: string[];
};
export const RequestLoggerMiddleware = (config: RequestLoggerConfig): RequestHandler => {
  return (req, _, next) => {
    if (!config.enable) return next();
    if (config.methods && !config.methods.includes(req.method)) return next();
    webdavLogger.info(
      'WebDav request received\n' +
        `Method: ${req.method}\n` +
        `URL: ${req.url}\n` +
        `Body: ${JSON.stringify(req.body)}\n` +
        `Headers: ${JSON.stringify(req.headers)}`,
    );
    next();
  };
};
