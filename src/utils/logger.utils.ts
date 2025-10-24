import winston from 'winston';
import { ConfigService } from '../services/config.service';

const maxLogSize = 40 * 1024 * 1024;
const maxLogsFiles = 5;

export const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: 'internxt-cli' },
  transports: [
    new winston.transports.File({
      filename: 'internxt-cli-error.log',
      level: 'error',
      dirname: ConfigService.INTERNXT_CLI_LOGS_DIR,
      maxsize: maxLogSize,
      maxFiles: maxLogsFiles,
      tailable: true,
    }),
    new winston.transports.File({
      filename: 'internxt-cli-combined.log',
      dirname: ConfigService.INTERNXT_CLI_LOGS_DIR,
      maxsize: maxLogSize,
      maxFiles: maxLogsFiles,
      tailable: true,
    }),
  ],
});

export const webdavLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
  defaultMeta: { service: 'internxt-webdav' },
  transports: [
    new winston.transports.File({
      filename: 'internxt-webdav-error.log',
      level: 'error',
      dirname: ConfigService.INTERNXT_CLI_LOGS_DIR,
      maxsize: maxLogSize,
      maxFiles: maxLogsFiles,
      tailable: true,
    }),
    new winston.transports.File({
      filename: 'internxt-webdav-combined.log',
      dirname: ConfigService.INTERNXT_CLI_LOGS_DIR,
      maxsize: maxLogSize,
      maxFiles: maxLogsFiles,
      tailable: true,
    }),
  ],
});
