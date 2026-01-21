import fs from 'node:fs/promises';
import { ConfigKeys } from '../types/config.types';
import { LoginCredentials, WebdavConfig } from '../types/command.types';
import { CryptoService } from './crypto.service';
import { ErrorUtils } from '../utils/errors.utils';
import {
  CREDENTIALS_FILE,
  INTERNXT_CLI_DATA_DIR,
  INTERNXT_CLI_LOGS_DIR,
  WEBDAV_CONFIGS_FILE,
  WEBDAV_DEFAULT_CREATE_FULL_PATH,
  WEBDAV_DEFAULT_HOST,
  WEBDAV_DEFAULT_PORT,
  WEBDAV_DEFAULT_PROTOCOL,
  WEBDAV_DEFAULT_TIMEOUT,
  WEBDAV_SSL_CERTS_DIR,
} from '../constants/configs';

export class ConfigService {
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
    await fs.writeFile(CREDENTIALS_FILE, encryptedCredentials, 'utf8');
  };

  /**
   * Clears the authenticated user from file
   * @async
   **/
  public clearUser = async (): Promise<void> => {
    try {
      const stat = await fs.stat(CREDENTIALS_FILE);
      if (stat.size === 0) return;
      await fs.writeFile(CREDENTIALS_FILE, '', 'utf8');
    } catch (error) {
      if (!ErrorUtils.isFileNotFoundError(error)) {
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
      const encryptedCredentials = await fs.readFile(CREDENTIALS_FILE, 'utf8');
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
    await fs.writeFile(WEBDAV_CONFIGS_FILE, configs, 'utf8');
  };

  public readWebdavConfig = async (): Promise<WebdavConfig> => {
    try {
      const configsData = await fs.readFile(WEBDAV_CONFIGS_FILE, 'utf8');
      const configs = JSON.parse(configsData);
      return {
        host: configs?.host ?? WEBDAV_DEFAULT_HOST,
        port: configs?.port ?? WEBDAV_DEFAULT_PORT,
        protocol: configs?.protocol ?? WEBDAV_DEFAULT_PROTOCOL,
        timeoutMinutes: configs?.timeoutMinutes ?? WEBDAV_DEFAULT_TIMEOUT,
        createFullPath: configs?.createFullPath ?? WEBDAV_DEFAULT_CREATE_FULL_PATH,
      };
    } catch {
      return {
        host: WEBDAV_DEFAULT_HOST,
        port: WEBDAV_DEFAULT_PORT,
        protocol: WEBDAV_DEFAULT_PROTOCOL,
        timeoutMinutes: WEBDAV_DEFAULT_TIMEOUT,
        createFullPath: WEBDAV_DEFAULT_CREATE_FULL_PATH,
      };
    }
  };

  ensureInternxtCliDataDirExists = async () => {
    try {
      await fs.access(INTERNXT_CLI_DATA_DIR);
    } catch {
      await fs.mkdir(INTERNXT_CLI_DATA_DIR);
    }
  };

  ensureWebdavCertsDirExists = async () => {
    try {
      await fs.access(WEBDAV_SSL_CERTS_DIR);
    } catch {
      await fs.mkdir(WEBDAV_SSL_CERTS_DIR);
    }
  };

  ensureInternxtLogsDirExists = async () => {
    try {
      await fs.access(INTERNXT_CLI_LOGS_DIR);
    } catch {
      await fs.mkdir(INTERNXT_CLI_LOGS_DIR);
    }
  };
}
