import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import { ConfigKeys } from '../types/config.types';
import { LoginCredentials, WebdavConfig } from '../types/command.types';
import { CryptoService } from './crypto.service';
import { isFileNotFoundError } from '../utils/errors.utils';

export class ConfigService {
  static readonly INTERNXT_CLI_DATA_DIR = path.join(os.homedir(), '.internxt-cli');
  static readonly INTERNXT_CLI_LOGS_DIR = path.join(this.INTERNXT_CLI_DATA_DIR, 'logs');
  static readonly INTERNXT_TMP_DIR = os.tmpdir();
  static readonly CREDENTIALS_FILE = path.join(this.INTERNXT_CLI_DATA_DIR, '.inxtcli');
  static readonly DRIVE_SQLITE_FILE = path.join(this.INTERNXT_CLI_DATA_DIR, 'internxt-cli-drive.sqlite');
  static readonly WEBDAV_SSL_CERTS_DIR = path.join(this.INTERNXT_CLI_DATA_DIR, 'certs');
  static readonly WEBDAV_CONFIGS_FILE = path.join(this.INTERNXT_CLI_DATA_DIR, 'config.webdav.inxt');
  static readonly WEBDAV_DEFAULT_HOST = '127.0.0.1';
  static readonly WEBDAV_DEFAULT_PORT = '3005';
  static readonly WEBDAV_DEFAULT_PROTOCOL = 'https';
  static readonly WEBDAV_DEFAULT_TIMEOUT = 0;
  static readonly WEBDAV_DEFAULT_CREATE_FULL_PATH = true;
  public static readonly instance: ConfigService = new ConfigService();

  /**
   * Gets the value from an environment key
   * @param key The environment key to retrieve
   * @throws {Error} If key is not found in process.env
   * @returns The value from the environment variable
   **/
  public get = (key: keyof ConfigKeys): string => {
    const value = process.env[key];
    if (!value) throw new Error(`Config key ${key} was not found in process.env`);
    return value;
  };

  /**
   * Saves the authenticated user credentials to file
   * @param loginCredentials The user credentials to be saved
   * @async
   **/
  public saveUser = async (loginCredentials: LoginCredentials): Promise<void> => {
    await this.ensureInternxtCliDataDirExists();
    const credentialsString = JSON.stringify(loginCredentials);
    const encryptedCredentials = CryptoService.instance.encryptText(credentialsString);
    await fs.writeFile(ConfigService.CREDENTIALS_FILE, encryptedCredentials, 'utf8');
  };

  /**
   * Clears the authenticated user from file
   * @async
   **/
  public clearUser = async (): Promise<void> => {
    try {
      const stat = await fs.stat(ConfigService.CREDENTIALS_FILE);
      if (stat.size === 0) return;
      await fs.writeFile(ConfigService.CREDENTIALS_FILE, '', 'utf8');
    } catch (error) {
      if (!isFileNotFoundError(error)) {
        throw error;
      }
    }
  };
  /**
   * Returns the authenticated user credentials
   * @returns {CLICredentials} The authenticated user credentials
   * @async
   **/
  public readUser = async (): Promise<LoginCredentials | undefined> => {
    try {
      const encryptedCredentials = await fs.readFile(ConfigService.CREDENTIALS_FILE, 'utf8');
      const credentialsString = CryptoService.instance.decryptText(encryptedCredentials);
      const loginCredentials = JSON.parse(credentialsString) as LoginCredentials;
      return loginCredentials;
    } catch {
      return;
    }
  };

  public saveWebdavConfig = async (webdavConfig: WebdavConfig): Promise<void> => {
    await this.ensureInternxtCliDataDirExists();
    const configs = JSON.stringify(webdavConfig);
    await fs.writeFile(ConfigService.WEBDAV_CONFIGS_FILE, configs, 'utf8');
  };

  public readWebdavConfig = async (): Promise<WebdavConfig> => {
    try {
      const configsData = await fs.readFile(ConfigService.WEBDAV_CONFIGS_FILE, 'utf8');
      const configs = JSON.parse(configsData);
      return {
        host: configs?.host ?? ConfigService.WEBDAV_DEFAULT_HOST,
        port: configs?.port ?? ConfigService.WEBDAV_DEFAULT_PORT,
        protocol: configs?.protocol ?? ConfigService.WEBDAV_DEFAULT_PROTOCOL,
        timeoutMinutes: configs?.timeoutMinutes ?? ConfigService.WEBDAV_DEFAULT_TIMEOUT,
        createFullPath: configs?.createFullPath ?? ConfigService.WEBDAV_DEFAULT_CREATE_FULL_PATH,
      };
    } catch {
      return {
        host: ConfigService.WEBDAV_DEFAULT_HOST,
        port: ConfigService.WEBDAV_DEFAULT_PORT,
        protocol: ConfigService.WEBDAV_DEFAULT_PROTOCOL,
        timeoutMinutes: ConfigService.WEBDAV_DEFAULT_TIMEOUT,
        createFullPath: ConfigService.WEBDAV_DEFAULT_CREATE_FULL_PATH,
      };
    }
  };

  ensureInternxtCliDataDirExists = async () => {
    try {
      await fs.access(ConfigService.INTERNXT_CLI_DATA_DIR);
    } catch {
      await fs.mkdir(ConfigService.INTERNXT_CLI_DATA_DIR);
    }
  };

  ensureWebdavCertsDirExists = async () => {
    try {
      await fs.access(ConfigService.WEBDAV_SSL_CERTS_DIR);
    } catch {
      await fs.mkdir(ConfigService.WEBDAV_SSL_CERTS_DIR);
    }
  };

  ensureInternxtLogsDirExists = async () => {
    try {
      await fs.access(ConfigService.INTERNXT_CLI_LOGS_DIR);
    } catch {
      await fs.mkdir(ConfigService.INTERNXT_CLI_LOGS_DIR);
    }
  };
}
