import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import { ConfigKeys } from '../types/config.types';
import { LoginCredentials } from '../types/command.types';
import { CryptoService } from './crypto.service';

export class ConfigService {
  static readonly INTERNXT_CLI_DATA_DIR = path.join(os.homedir(), '.internxt-cli');
  static readonly INTERNXT_TMP_DIR = os.tmpdir();
  static readonly CREDENTIALS_FILE = path.join(this.INTERNXT_CLI_DATA_DIR, '.inxtcli');
  static readonly DRIVE_REALM_FILE = path.join(this.INTERNXT_CLI_DATA_DIR, 'internxt-cli-drive.realm');
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
    const stat = await fs.stat(ConfigService.CREDENTIALS_FILE);

    if (stat.size === 0) throw new Error('Credentials file is already empty');
    return fs.writeFile(ConfigService.CREDENTIALS_FILE, '', 'utf8');
  };

  /**
   * Returns the authenticated user credentials
   * @returns {LoginCredentials} The authenticated user credentials
   * @async
   **/
  public readUser = async (): Promise<LoginCredentials | undefined> => {
    try {
      const encryptedCredentials = await fs.readFile(ConfigService.CREDENTIALS_FILE, 'utf8');
      const credentialsString = CryptoService.instance.decryptText(encryptedCredentials);
      const loginCredentials = JSON.parse(credentialsString, (key, value) => {
        if (typeof value === 'string' && key === 'createdAt') {
          return new Date(value);
        }
        return value;
      }) as LoginCredentials;
      return loginCredentials;
    } catch {
      return;
    }
  };

  ensureInternxtCliDataDirExists = async () => {
    try {
      await fs.access(ConfigService.INTERNXT_CLI_DATA_DIR);
    } catch {
      await fs.mkdir(ConfigService.INTERNXT_CLI_DATA_DIR);
    }
  };
}
