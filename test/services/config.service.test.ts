import { beforeEach, describe, expect, test, vi } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { ConfigService } from '../../src/services/config.service';
import { CryptoService } from '../../src/services/crypto.service';
import { LoginCredentials, WebdavConfig } from '../../src/types/command.types';
import { UserCredentialsFixture } from '../fixtures/login.fixture';
import { fail } from 'node:assert';
import {
  CREDENTIALS_FILE,
  WEBDAV_CONFIGS_FILE,
  WEBDAV_DEFAULT_CREATE_FULL_PATH,
  WEBDAV_DEFAULT_HOST,
  WEBDAV_DEFAULT_PORT,
  WEBDAV_DEFAULT_PROTOCOL,
  WEBDAV_DEFAULT_TIMEOUT,
  WEBDAV_DEFAULT_CUSTOM_AUTH,
  WEBDAV_SSL_CERTS_DIR,
  WEBDAV_DEFAULT_DELETE_FILES_PERMANENTLY,
} from '../../src/constants/configs';
import { getWebdavConfigMock } from '../fixtures/webdav.fixture';
import { CacheService } from '../../src/services/cache.service';

const env = Object.assign({}, process.env);

describe('Config service', () => {
  const defaultWebdavConfig: WebdavConfig = {
    host: WEBDAV_DEFAULT_HOST,
    port: WEBDAV_DEFAULT_PORT,
    protocol: WEBDAV_DEFAULT_PROTOCOL,
    timeoutMinutes: WEBDAV_DEFAULT_TIMEOUT,
    createFullPath: WEBDAV_DEFAULT_CREATE_FULL_PATH,
    customAuth: WEBDAV_DEFAULT_CUSTOM_AUTH,
    username: '',
    password: '',
    deleteFilesPermanently: WEBDAV_DEFAULT_DELETE_FILES_PERMANENTLY,
  };

  beforeEach(() => {
    process.env = env;
    vi.spyOn(CacheService.instance, 'get').mockReturnValue(null);
    vi.spyOn(CacheService.instance, 'set').mockImplementation(() => {});
  });

  test('when an environment variable is requested, then its value is returned', async () => {
    const envKey = 'APP_CRYPTO_SECRET';
    const envValue = crypto.randomBytes(8).toString('hex');
    process.env[envKey] = envValue;

    const newEnvValue = ConfigService.instance.get(envKey);
    expect(newEnvValue).to.be.equal(envValue);
  });

  test('when an environment variable has no value set, then an error is thrown', async () => {
    const envKey = 'APP_CRYPTO_SECRET';
    process.env = {};

    try {
      ConfigService.instance.get(envKey);
      fail('Expected function to throw an error, but it did not.');
    } catch (err) {
      const error = err as Error;
      expect(error.message).to.be.equal(`Config key ${envKey} was not found in process.env`);
    }
  });

  test('when user credentials are saved, then they are encrypted and written to a temporary file before being renamed', async () => {
    const userCredentials: LoginCredentials = UserCredentialsFixture;
    const stringCredentials = JSON.stringify(userCredentials);
    const encryptedUserCredentials = CryptoService.instance.encryptText(stringCredentials);
    const tempPath = CREDENTIALS_FILE + '.tmp';

    const configServiceStub = vi.spyOn(CryptoService.instance, 'encryptText').mockReturnValue(encryptedUserCredentials);
    const writeFileStub = vi.spyOn(fs, 'writeFile').mockResolvedValue();
    const renameStub = vi.spyOn(fs, 'rename').mockResolvedValue();

    await ConfigService.instance.saveUser(userCredentials);
    expect(configServiceStub).toHaveBeenCalledWith(stringCredentials);
    expect(writeFileStub).toHaveBeenCalledWith(tempPath, encryptedUserCredentials, 'utf8');
    expect(renameStub).toHaveBeenCalledWith(tempPath, CREDENTIALS_FILE);
  });

  test('when stored credentials are read, then they are decrypted and returned', async () => {
    const userCredentials: LoginCredentials = UserCredentialsFixture;
    const stringCredentials = JSON.stringify(userCredentials);
    const encryptedUserCredentials = CryptoService.instance.encryptText(stringCredentials);

    const fsStub = vi.spyOn(fs, 'readFile').mockResolvedValue(encryptedUserCredentials);
    const configServiceStub = vi.spyOn(CryptoService.instance, 'decryptText').mockReturnValue(stringCredentials);

    const loginCredentials = await ConfigService.instance.readUser();
    expect(userCredentials).to.be.deep.equal(loginCredentials);
    expect(fsStub).toHaveBeenCalledWith(CREDENTIALS_FILE, 'utf8');
    expect(configServiceStub).toHaveBeenCalledWith(encryptedUserCredentials);
  });

  test('when the credentials file does not exist, then undefined is returned', async () => {
    const fsStub = vi.spyOn(fs, 'readFile').mockRejectedValue(new Error());
    const configServiceStub = vi.spyOn(CryptoService.instance, 'decryptText');

    const loginCredentials = await ConfigService.instance.readUser();
    expect(loginCredentials).to.be.equal(undefined);
    expect(fsStub).toHaveBeenCalledWith(CREDENTIALS_FILE, 'utf8');
    expect(configServiceStub).not.toHaveBeenCalled();
  });

  test('when stored credentials are cleared, then the file content is wiped', async () => {
    const writeFileStub = vi.spyOn(fs, 'writeFile').mockResolvedValue();
    const readFileStub = vi.spyOn(fs, 'readFile').mockResolvedValue('');
    const existFileStub = vi
      .spyOn(fs, 'stat')
      // @ts-expect-error - We stub the stat method partially
      .mockResolvedValue({ size: BigInt(crypto.randomInt(1, 100000)) });

    await ConfigService.instance.clearUser();
    const credentialsFileContent = await fs.readFile(CREDENTIALS_FILE, 'utf8');

    expect(writeFileStub).toHaveBeenCalledWith(CREDENTIALS_FILE, '', 'utf8');
    expect(readFileStub).toHaveBeenCalledWith(CREDENTIALS_FILE, 'utf8');
    expect(existFileStub).toHaveBeenCalledWith(CREDENTIALS_FILE);
    expect(credentialsFileContent).to.be.equal('');
  });

  test('when the credentials file is already empty, then clearing does not throw an error', async () => {
    const statStub = vi
      .spyOn(fs, 'stat')
      // @ts-expect-error - We stub the stat method partially
      .mockResolvedValue({ size: 0 });
    const writeFileStub = vi.spyOn(fs, 'writeFile').mockResolvedValue();

    await ConfigService.instance.clearUser();

    expect(statStub).toHaveBeenCalledWith(CREDENTIALS_FILE);
    expect(writeFileStub).not.toHaveBeenCalled();
  });

  test('when the credentials file does not exist, then clearing does not throw an error', async () => {
    const fileNotFoundError = new Error('File not found');
    Object.assign(fileNotFoundError, { code: 'ENOENT' });

    const statStub = vi.spyOn(fs, 'stat').mockRejectedValue(fileNotFoundError);
    const writeFileStub = vi.spyOn(fs, 'writeFile').mockResolvedValue();

    await ConfigService.instance.clearUser();

    expect(statStub).toHaveBeenCalledWith(CREDENTIALS_FILE);
    expect(writeFileStub).not.toHaveBeenCalled();
  });

  test('when the certificates directory does not exist, then it is created', async () => {
    vi.spyOn(fs, 'access').mockRejectedValue(new Error());

    const stubMkdir = vi.spyOn(fs, 'mkdir').mockResolvedValue('');

    await ConfigService.instance.ensureWebdavCertsDirExists();

    expect(stubMkdir).toHaveBeenCalledWith(WEBDAV_SSL_CERTS_DIR);
  });

  test('when the WebDAV configuration is saved, then it is written to a temporary file before being renamed', async () => {
    const webdavConfig: WebdavConfig = getWebdavConfigMock();
    const stringConfig = JSON.stringify(webdavConfig);
    const tempPath = WEBDAV_CONFIGS_FILE + '.tmp';

    const writeFileStub = vi.spyOn(fs, 'writeFile').mockResolvedValue();
    const renameStub = vi.spyOn(fs, 'rename').mockResolvedValue();
    const cacheSetSpy = vi.spyOn(CacheService.instance, 'set');

    await ConfigService.instance.saveWebdavConfig(webdavConfig);
    expect(cacheSetSpy).toHaveBeenCalledWith(CacheService.WEBDAV_CONFIG_CACHE_KEY, webdavConfig);
    expect(writeFileStub).toHaveBeenCalledWith(tempPath, stringConfig, 'utf8');
    expect(renameStub).toHaveBeenCalledWith(tempPath, WEBDAV_CONFIGS_FILE);
  });

  test('when the WebDAV configuration is read from storage, then it is cached in memory', async () => {
    const webdavConfig: WebdavConfig = getWebdavConfigMock();
    const stringConfig = JSON.stringify(webdavConfig);

    const fsStub = vi.spyOn(fs, 'readFile').mockResolvedValue(stringConfig);
    const cacheSetSpy = vi.spyOn(CacheService.instance, 'set');

    const webdavConfigResult = await ConfigService.instance.readWebdavConfig();
    expect(webdavConfigResult).to.be.deep.equal(webdavConfig);
    expect(fsStub).toHaveBeenCalledWith(WEBDAV_CONFIGS_FILE, 'utf8');
    expect(cacheSetSpy).toHaveBeenCalledWith(CacheService.WEBDAV_CONFIG_CACHE_KEY, webdavConfig);
  });

  test('when the WebDAV configuration is already cached, then it is returned without reading storage', async () => {
    const webdavConfig: WebdavConfig = getWebdavConfigMock();
    vi.spyOn(CacheService.instance, 'get').mockReturnValue(webdavConfig);
    const fsStub = vi.spyOn(fs, 'readFile');

    const webdavConfigResult = await ConfigService.instance.readWebdavConfig();
    expect(webdavConfigResult).to.be.deep.equal(webdavConfig);
    expect(fsStub).not.toHaveBeenCalled();
  });

  test('when the WebDAV configuration file is empty, then default values are used', async () => {
    const fsStub = vi.spyOn(fs, 'readFile').mockResolvedValue('');

    const webdavConfigResult = await ConfigService.instance.readWebdavConfig();
    expect(webdavConfigResult).to.be.deep.equal(defaultWebdavConfig);
    expect(fsStub).toHaveBeenCalledWith(WEBDAV_CONFIGS_FILE, 'utf8');
  });

  test('when reading the WebDAV configuration fails, then default values are used', async () => {
    const fsStub = vi.spyOn(fs, 'readFile').mockRejectedValue(new Error());

    const webdavConfigResult = await ConfigService.instance.readWebdavConfig();
    expect(webdavConfigResult).to.be.deep.equal(defaultWebdavConfig);
    expect(fsStub).toHaveBeenCalledWith(WEBDAV_CONFIGS_FILE, 'utf8');
  });

  test('when the WebDAV configuration is missing the directory creation setting, then it defaults to enabled', async () => {
    const partialWebdavConfig = {
      host: '192.168.1.1',
      port: '8080',
      protocol: 'https',
      timeoutMinutes: 30,
    };
    const stringConfig = JSON.stringify(partialWebdavConfig);

    const fsStub = vi.spyOn(fs, 'readFile').mockResolvedValue(stringConfig);

    const webdavConfigResult = await ConfigService.instance.readWebdavConfig();
    expect(webdavConfigResult.createFullPath).to.be.equal(true);
    expect(webdavConfigResult.host).to.be.equal(partialWebdavConfig.host);
    expect(webdavConfigResult.port).to.be.equal(partialWebdavConfig.port);
    expect(fsStub).toHaveBeenCalledWith(WEBDAV_CONFIGS_FILE, 'utf8');
  });

  test('when the directory creation option is explicitly disabled in the WebDAV configuration, then it is returned as disabled', async () => {
    const webdavConfig = {
      host: '192.168.1.1',
      port: '8080',
      protocol: 'https',
      timeoutMinutes: 30,
      createFullPath: false,
    };
    const stringConfig = JSON.stringify(webdavConfig);

    const fsStub = vi.spyOn(fs, 'readFile').mockResolvedValue(stringConfig);

    const webdavConfigResult = await ConfigService.instance.readWebdavConfig();
    expect(webdavConfigResult.createFullPath).to.be.equal(false);
    expect(fsStub).toHaveBeenCalledWith(WEBDAV_CONFIGS_FILE, 'utf8');
  });

  test('when the directory creation option is explicitly enabled in the WebDAV configuration, then it is returned as enabled', async () => {
    const webdavConfig = {
      host: '192.168.1.1',
      port: '8080',
      protocol: 'https',
      timeoutMinutes: 30,
      createFullPath: true,
    };
    const stringConfig = JSON.stringify(webdavConfig);

    const fsStub = vi.spyOn(fs, 'readFile').mockResolvedValue(stringConfig);

    const webdavConfigResult = await ConfigService.instance.readWebdavConfig();
    expect(webdavConfigResult.createFullPath).to.be.equal(true);
    expect(fsStub).toHaveBeenCalledWith(WEBDAV_CONFIGS_FILE, 'utf8');
  });
});
