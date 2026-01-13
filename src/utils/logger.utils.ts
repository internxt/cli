import winston from 'winston';
import { INTERNXT_CLI_LOGS_DIR } from '../constants/configs';

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
      dirname: INTERNXT_CLI_LOGS_DIR,
      maxsize: maxLogSize,
      maxFiles: maxLogsFiles,
      tailable: true,
    }),
    new winston.transports.File({
      filename: 'internxt-cli-combined.log',
      dirname: INTERNXT_CLI_LOGS_DIR,
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
      dirname: INTERNXT_CLI_LOGS_DIR,
      maxsize: maxLogSize,
      maxFiles: maxLogsFiles,
      tailable: true,
    }),
    new winston.transports.File({
      filename: 'internxt-webdav-combined.log',
      dirname: INTERNXT_CLI_LOGS_DIR,
      maxsize: maxLogSize,
      maxFiles: maxLogsFiles,
      tailable: true,
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
