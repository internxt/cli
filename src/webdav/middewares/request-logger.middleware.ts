import { RequestHandler } from 'express';
import { webdavLogger } from '../../utils/logger.utils';
import { AnalyticsService } from '../../services/analytics.service';

type RequestLoggerConfig = {
  enable: boolean;
  methods?: string[];
};
export const RequestLoggerMiddleware = (config: RequestLoggerConfig): RequestHandler => {
  return (req, _, next) => {
    AnalyticsService.instance.track('WebDAVRequest', { app: 'internxt-webdav' }, { method: req.method.toUpperCase() });
    if (!config.enable) return next();
    if (config.methods && !config.methods.includes(req.method)) return next();
    webdavLogger.info(
      `WebDav request received\nMethod: ${req.method}\nURL: ${req.url}\nBody: ${req.body}\nHeaders: ${JSON.stringify(req.headers)}`,
    );
    next();
  };
};
