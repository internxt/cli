import { expect } from 'chai';
import crypto from 'crypto';
import Sinon, { SinonSandbox } from 'sinon';
import fs from 'fs/promises';
import { ConfigService } from '../../src/services/config.service';
import { CryptoService } from '../../src/services/crypto.service';
import { LoginCredentials } from '../../src/types/login.types';
import { UserFixture } from '../fixtures/auth.fixture';

import { config } from 'dotenv';
config();

const env = Object.assign({}, process.env);

describe('Config service', () => {
  let configServiceSandbox: SinonSandbox;

  beforeEach(() => {
    configServiceSandbox = Sinon.createSandbox();
  });

  afterEach(() => {
    process.env = env;
    configServiceSandbox.restore();
  });

  it('When an env property is requested, then the get method return its value', async () => {
    const envKey = 'APP_CRYPTO_SECRET';
    const envValue = crypto.randomBytes(8).toString('hex');
    process.env[envKey] = envValue;

    const newEnvValue = ConfigService.instance.get(envKey);
    expect(newEnvValue).to.equal(envValue);
  });

  it('When an env property that do not have value is requested, then an error is thrown', async () => {
    const envKey = 'APP_CRYPTO_SECRET';
    process.env = {};

    try {
      ConfigService.instance.get(envKey);
      expect(false).to.be.true; //should throw error
    } catch (err) {
      const error = err as Error;
      expect(error.message).to.equal(`Config key ${envKey} was not found in process.env`);
    }
  });

  it('When user credentials are saved, then they are written encrypted to a file', async () => {
    const userCredentials: LoginCredentials = {
      user: UserFixture,
      token: crypto.randomBytes(16).toString('hex'),
      newToken: crypto.randomBytes(16).toString('hex'),
      mnemonic: crypto.randomBytes(16).toString('hex'),
    };
    const stringCredentials = JSON.stringify(userCredentials);
    const encryptedUserCredentials = CryptoService.instance.encryptText(stringCredentials);

    const configServiceStub = configServiceSandbox
      .stub(CryptoService.instance, 'encryptText')
      .withArgs(stringCredentials)
      .returns(encryptedUserCredentials);
    const fsStub = configServiceSandbox
      .stub(fs, 'writeFile')
      .withArgs(ConfigService.CREDENTIALS_FILE, encryptedUserCredentials)
      .resolves();

    await ConfigService.instance.saveUser(userCredentials);
    expect(configServiceStub).to.be.calledWith(stringCredentials);
    expect(fsStub).to.be.calledWith(ConfigService.CREDENTIALS_FILE, encryptedUserCredentials);
  });

  it('When user credentials are read, then they are read and decrypted from a file', async () => {
    const userCredentials: LoginCredentials = {
      user: UserFixture,
      token: crypto.randomBytes(16).toString('hex'),
      newToken: crypto.randomBytes(16).toString('hex'),
      mnemonic: crypto.randomBytes(16).toString('hex'),
    };
    const stringCredentials = JSON.stringify(userCredentials);
    const encryptedUserCredentials = CryptoService.instance.encryptText(stringCredentials);

    const fsStub = configServiceSandbox
      .stub(fs, 'readFile')
      .withArgs(ConfigService.CREDENTIALS_FILE)
      .resolves(encryptedUserCredentials);
    const configServiceStub = configServiceSandbox
      .stub(CryptoService.instance, 'decryptText')
      .withArgs(encryptedUserCredentials)
      .returns(stringCredentials);

    const loginCredentials = await ConfigService.instance.readUser();
    expect(userCredentials).to.be.eql(loginCredentials);
    expect(fsStub).to.be.calledWith(ConfigService.CREDENTIALS_FILE);
    expect(configServiceStub).to.be.calledWith(encryptedUserCredentials);
  });

  it('When user credentials are read but they dont exist, then they are not returned', async () => {
    const fsStub = configServiceSandbox.stub(fs, 'readFile').withArgs(ConfigService.CREDENTIALS_FILE).rejects();
    const configServiceStub = configServiceSandbox.stub(CryptoService.instance, 'decryptText');

    const loginCredentials = await ConfigService.instance.readUser();
    expect(loginCredentials).to.be.undefined;
    expect(fsStub).to.be.calledWith(ConfigService.CREDENTIALS_FILE);
    expect(configServiceStub).to.not.be.called;
  });

  it('When user credentials are cleared, then they are cleared from file', async () => {
    const writeFileStub = configServiceSandbox
      .stub(fs, 'writeFile')
      .withArgs(ConfigService.CREDENTIALS_FILE, '')
      .resolves();
    const readFileStub = configServiceSandbox
      .stub(fs, 'readFile')
      .withArgs(ConfigService.CREDENTIALS_FILE)
      .resolves('');

    await ConfigService.instance.clearUser();
    const credentialsFileContent = await fs.readFile(ConfigService.CREDENTIALS_FILE, 'utf8');

    expect(writeFileStub).to.be.have.been.calledWith(ConfigService.CREDENTIALS_FILE, '');
    expect(readFileStub).to.be.have.been.calledWith(ConfigService.CREDENTIALS_FILE);
    expect(credentialsFileContent).to.be.empty;
  });

  it('When user credentials are cleared and the file is empty, an error is thrown', async () => {
    configServiceSandbox
      .stub(fs, 'stat')
      .withArgs(ConfigService.CREDENTIALS_FILE)
      // @ts-expect-error - We stub the stat method partially
      .resolves({ size: 0 });

    try {
      await ConfigService.instance.clearUser();
      expect(false).to.be.true;
    } catch (error) {
      expect((error as Error).message).to.equal('Credentials file is already empty');
    }
  });
});
