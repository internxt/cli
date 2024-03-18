import winston from 'winston';
import { ConfigService } from '../services/config.service';

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'internxt-cli' },
  transports: [
    new winston.transports.File({
      filename: 'internxt-cli-error.log',
      level: 'error',
      dirname: ConfigService.INTERNXT_CLI_LOGS_DIR,
    }),
    new winston.transports.File({
      filename: 'internxt-cli-combined.log',
      dirname: ConfigService.INTERNXT_CLI_LOGS_DIR,
    }),
  ],
});

export const webdavLogger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  defaultMeta: { service: 'internxt-webdav' },
  transports: [
    new winston.transports.File({
      filename: 'internxt-webdav-error.log',
      level: 'error',
      dirname: ConfigService.INTERNXT_CLI_LOGS_DIR,
    }),
    new winston.transports.File({
      filename: 'internxt-webdav-combined.log',
      dirname: ConfigService.INTERNXT_CLI_LOGS_DIR,
    }),
  ],
});

if (process.env.NODE_ENV !== 'production') {
  webdavLogger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  );
}

if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  );
}
