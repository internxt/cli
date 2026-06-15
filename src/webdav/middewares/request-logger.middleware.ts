import { RequestHandler } from 'express';
import { webdavLogger } from '../../utils/logger.utils';

type RequestLoggerConfig = {
  enable: boolean;
  methods?: string[];
};
export const RequestLoggerMiddleware = (config: RequestLoggerConfig): RequestHandler => {
  return (req, res, next) => {
    if (!config.enable) return next();
    if (config.methods && !config.methods.includes(req.method)) return next();

    const start = Date.now();
    const contentLength = req.headers['content-length'] ?? '0';

    webdavLogger.info(`[${req.method}] ${req.url} - Start (${contentLength}B)`);

    const originalEnd = res.end.bind(res);
    res.end = function (...args: Parameters<typeof originalEnd>): ReturnType<typeof originalEnd> {
      const duration = Date.now() - start;
      webdavLogger.info(`[${req.method}] ${req.url} - ${res.statusCode} (${duration}ms)`);
      return originalEnd(...args);
    } as typeof originalEnd;

    next();
  };
};
