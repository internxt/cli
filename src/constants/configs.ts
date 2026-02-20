import path from 'node:path';
import os from 'node:os';

export const INTERNXT_CLI_DATA_DIR = path.join(os.homedir(), '.internxt-cli');
export const INTERNXT_CLI_LOGS_DIR = path.join(INTERNXT_CLI_DATA_DIR, 'logs');
export const CREDENTIALS_FILE = path.join(INTERNXT_CLI_DATA_DIR, '.inxtcli');
export const DRIVE_SQLITE_FILE = path.join(INTERNXT_CLI_DATA_DIR, 'internxt-cli-drive.db');
export const WEBDAV_SSL_CERTS_DIR = path.join(INTERNXT_CLI_DATA_DIR, 'certs');
export const WEBDAV_CONFIGS_FILE = path.join(INTERNXT_CLI_DATA_DIR, 'config.webdav.inxt');
export const WEBDAV_DEFAULT_HOST = '127.0.0.1';
export const WEBDAV_DEFAULT_PORT = '3005';
export const WEBDAV_DEFAULT_PROTOCOL = 'https';
export const WEBDAV_DEFAULT_TIMEOUT = 0;
export const WEBDAV_DEFAULT_CREATE_FULL_PATH = true;
