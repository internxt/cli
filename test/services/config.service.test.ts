import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { ConfigService } from '../../src/services/config.service';
import { CryptoService } from '../../src/services/crypto.service';
import { LoginCredentials, WebdavConfig } from '../../src/types/command.types';
import { UserCredentialsFixture } from '../fixtures/login.fixture';
import { fail } from 'node:assert';

const env = Object.assign({}, process.env);

describe('Config service', () => {
  beforeEach(() => {
    process.env = env;
    vi.restoreAllMocks();
  });

  it('When an env property is requested, then the get method return its value', async () => {
    const envKey = 'APP_CRYPTO_SECRET';
    const envValue = crypto.randomBytes(8).toString('hex');
    process.env[envKey] = envValue;

    const newEnvValue = ConfigService.instance.get(envKey);
    expect(newEnvValue).to.be.equal(envValue);
  });

  it('When an env property that do not have value is requested, then an error is thrown', async () => {
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

  it('When user credentials are saved, then they are written encrypted to a file', async () => {
    const userCredentials: LoginCredentials = UserCredentialsFixture;
    const stringCredentials = JSON.stringify(userCredentials);
    const encryptedUserCredentials = CryptoService.instance.encryptText(stringCredentials);

    const configServiceStub = vi.spyOn(CryptoService.instance, 'encryptText').mockReturnValue(encryptedUserCredentials);
    const fsStub = vi.spyOn(fs, 'writeFile').mockResolvedValue();

    await ConfigService.instance.saveUser(userCredentials);
    expect(configServiceStub).toHaveBeenCalledWith(stringCredentials);
    expect(fsStub).toHaveBeenCalledWith(ConfigService.CREDENTIALS_FILE, encryptedUserCredentials, 'utf8');
  });

  it('When user credentials are read, then they are read and decrypted from a file', async () => {
    const userCredentials: LoginCredentials = UserCredentialsFixture;
    const stringCredentials = JSON.stringify(userCredentials);
    const encryptedUserCredentials = CryptoService.instance.encryptText(stringCredentials);

    const fsStub = vi.spyOn(fs, 'readFile').mockResolvedValue(encryptedUserCredentials);
    const configServiceStub = vi.spyOn(CryptoService.instance, 'decryptText').mockReturnValue(stringCredentials);

    const loginCredentials = await ConfigService.instance.readUser();
    expect(userCredentials).to.be.deep.equal(loginCredentials);
    expect(fsStub).toHaveBeenCalledWith(ConfigService.CREDENTIALS_FILE, 'utf8');
    expect(configServiceStub).toHaveBeenCalledWith(encryptedUserCredentials);
  });

  it('When user credentials are read but they dont exist, then they are not returned', async () => {
    const fsStub = vi.spyOn(fs, 'readFile').mockRejectedValue(new Error());
    const configServiceStub = vi.spyOn(CryptoService.instance, 'decryptText');

    const loginCredentials = await ConfigService.instance.readUser();
    expect(loginCredentials).to.be.equal(undefined);
    expect(fsStub).toHaveBeenCalledWith(ConfigService.CREDENTIALS_FILE, 'utf8');
    expect(configServiceStub).not.toHaveBeenCalled();
  });

  it('When user credentials are cleared, then they are cleared from file', async () => {
    const writeFileStub = vi.spyOn(fs, 'writeFile').mockResolvedValue();
    const readFileStub = vi.spyOn(fs, 'readFile').mockResolvedValue('');
    const existFileStub = vi
      .spyOn(fs, 'stat')
      // @ts-expect-error - We stub the stat method partially
      .mockResolvedValue({ size: BigInt(crypto.randomInt(1, 100000)) });

    await ConfigService.instance.clearUser();
    const credentialsFileContent = await fs.readFile(ConfigService.CREDENTIALS_FILE, 'utf8');

    expect(writeFileStub).toHaveBeenCalledWith(ConfigService.CREDENTIALS_FILE, '', 'utf8');
    expect(readFileStub).toHaveBeenCalledWith(ConfigService.CREDENTIALS_FILE, 'utf8');
    expect(existFileStub).toHaveBeenCalledWith(ConfigService.CREDENTIALS_FILE);
    expect(credentialsFileContent).to.be.equal('');
  });

  it('When user credentials are cleared and the file is empty, then an error is thrown', async () => {
    vi.spyOn(fs, 'stat')
      // @ts-expect-error - We stub the stat method partially
      .mockResolvedValue({ size: 0 });

    try {
      await ConfigService.instance.clearUser();
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.be.equal('Credentials file is already empty');
    }
  });

  it('When webdav certs directory is required to exist, then it is created', async () => {
    vi.spyOn(fs, 'access').mockRejectedValue(new Error());

    const stubMkdir = vi.spyOn(fs, 'mkdir').mockResolvedValue('');

    await ConfigService.instance.ensureWebdavCertsDirExists();

    expect(stubMkdir).toHaveBeenCalledWith(ConfigService.WEBDAV_SSL_CERTS_DIR);
  });

  it('When webdav config options are saved, then they are written to a file', async () => {
    const webdavConfig: WebdavConfig = {
      host: '127.0.0.1',
      port: crypto.randomInt(65000).toString(),
      protocol: 'https',
      timeoutMinutes: crypto.randomInt(100),
      createFullPath: false,
    };
    const stringConfig = JSON.stringify(webdavConfig);

    const fsStub = vi.spyOn(fs, 'writeFile').mockResolvedValue();

    await ConfigService.instance.saveWebdavConfig(webdavConfig);
    expect(fsStub).toHaveBeenCalledWith(ConfigService.WEBDAV_CONFIGS_FILE, stringConfig, 'utf8');
  });

  it('When webdav config options are read and exist, then they are read from a file', async () => {
    const webdavConfig: WebdavConfig = {
      host: '127.0.0.1',
      port: crypto.randomInt(65000).toString(),
      protocol: 'http',
      timeoutMinutes: crypto.randomInt(100),
      createFullPath: false,
    };
    const stringConfig = JSON.stringify(webdavConfig);

    const fsStub = vi.spyOn(fs, 'readFile').mockResolvedValue(stringConfig);

    const webdavConfigResult = await ConfigService.instance.readWebdavConfig();
    expect(webdavConfigResult).to.be.deep.equal(webdavConfig);
    expect(fsStub).toHaveBeenCalledWith(ConfigService.WEBDAV_CONFIGS_FILE, 'utf8');
  });

  it('When webdav config options are read but not exist, then they are returned from defaults', async () => {
    const defaultWebdavConfig: WebdavConfig = {
      host: ConfigService.WEBDAV_DEFAULT_HOST,
      port: ConfigService.WEBDAV_DEFAULT_PORT,
      protocol: ConfigService.WEBDAV_DEFAULT_PROTOCOL,
      timeoutMinutes: ConfigService.WEBDAV_DEFAULT_TIMEOUT,
      createFullPath: ConfigService.WEBDAV_DEFAULT_CREATE_FULL_PATH,
    };

    const fsStub = vi.spyOn(fs, 'readFile').mockResolvedValue('');

    const webdavConfigResult = await ConfigService.instance.readWebdavConfig();
    expect(webdavConfigResult).to.be.deep.equal(defaultWebdavConfig);
    expect(fsStub).toHaveBeenCalledWith(ConfigService.WEBDAV_CONFIGS_FILE, 'utf8');
  });

  it('When webdav config options are read but an error is thrown, then they are returned from defaults', async () => {
    const defaultWebdavConfig: WebdavConfig = {
      host: ConfigService.WEBDAV_DEFAULT_HOST,
      port: ConfigService.WEBDAV_DEFAULT_PORT,
      protocol: ConfigService.WEBDAV_DEFAULT_PROTOCOL,
      timeoutMinutes: ConfigService.WEBDAV_DEFAULT_TIMEOUT,
      createFullPath: ConfigService.WEBDAV_DEFAULT_CREATE_FULL_PATH,
    };

    const fsStub = vi.spyOn(fs, 'readFile').mockRejectedValue(new Error());

    const webdavConfigResult = await ConfigService.instance.readWebdavConfig();
    expect(webdavConfigResult).to.be.deep.equal(defaultWebdavConfig);
    expect(fsStub).toHaveBeenCalledWith(ConfigService.WEBDAV_CONFIGS_FILE, 'utf8');
  });

  it('should default to true when webdav config exists but createFullPath property is missing', async () => {
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
    expect(fsStub).toHaveBeenCalledWith(ConfigService.WEBDAV_CONFIGS_FILE, 'utf8');
  });

  it('shoud return false when webdav config has createFullPath explicitly set to false', async () => {
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
    expect(fsStub).toHaveBeenCalledWith(ConfigService.WEBDAV_CONFIGS_FILE, 'utf8');
  });

  it('should return true when webdav config has createFullPath explicitly set to true', async () => {
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
    expect(fsStub).toHaveBeenCalledWith(ConfigService.WEBDAV_CONFIGS_FILE, 'utf8');
  });
});
