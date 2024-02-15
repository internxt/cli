import chai, { expect } from 'chai';
import sinon, { SinonSandbox } from 'sinon';
import sinonChai from 'sinon-chai';
import crypto from 'crypto';
import { ConfigService } from '../../src/services/config.service';
import { CryptoService } from '../../src/services/crypto.service';
import { ConfigKeys } from '../../src/types/config.types';
import { Keys } from '@internxt/sdk';
import { KeysService } from '../../src/services/keys.service';

chai.use(sinonChai);

describe('Crypto service', () => {
  let cryptoServiceSandbox: SinonSandbox;

  beforeEach(() => {
    cryptoServiceSandbox = sinon.createSandbox();
  });

  afterEach(() => {
    cryptoServiceSandbox.restore();
  });

  it('When text is encrypted using crypto secret env, then it can be decrypted back', () => {
    const envEndpoint: { key: keyof ConfigKeys; value: string } = {
      key: 'APP_CRYPTO_SECRET',
      value: crypto.randomBytes(16).toString('hex'),
    };
    const textToEncrypt = crypto.randomBytes(16).toString('hex');

    const spyConfigService = cryptoServiceSandbox
      .stub(ConfigService.instance, 'get')
      .withArgs(envEndpoint.key)
      .returns(envEndpoint.value);

    const textEncrypted = CryptoService.instance.encryptText(textToEncrypt);
    const textDecrypted = CryptoService.instance.decryptText(textEncrypted);
    expect(textDecrypted).to.be.equal(textToEncrypt);
    expect(spyConfigService).to.be.calledWith(envEndpoint.key);
  });

  it('When text is encrypted using crypto secret env, then it can be decrypted back', () => {
    const envEndpoint: { key: keyof ConfigKeys; value: string } = {
      key: 'APP_CRYPTO_SECRET',
      value: crypto.randomBytes(16).toString('hex'),
    };
    const textToEncrypt = crypto.randomBytes(16).toString('hex');

    const spyConfigService = cryptoServiceSandbox
      .stub(ConfigService.instance, 'get')
      .withArgs(envEndpoint.key)
      .returns(envEndpoint.value);

    const textEncrypted = CryptoService.instance.encryptText(textToEncrypt);
    const textDecrypted = CryptoService.instance.decryptText(textEncrypted);
    expect(textDecrypted).to.be.equal(textToEncrypt);
    expect(spyConfigService).to.be.calledWith(envEndpoint.key);
  });

  it('When a password is hashed using CryptoProvider, then it is hashed correctly', () => {
    const envEndpoint: { key: keyof ConfigKeys; value: string } = {
      key: 'APP_CRYPTO_SECRET',
      value: crypto.randomBytes(16).toString('hex'),
    };
    const spyConfigService = cryptoServiceSandbox
      .stub(ConfigService.instance, 'get')
      .withArgs(envEndpoint.key)
      .returns(envEndpoint.value);

    const password = {
      value: crypto.randomBytes(16).toString('hex'),
      salt: crypto.randomBytes(16).toString('hex'),
    };

    const encryptedSalt = CryptoService.instance.encryptText(password.salt);
    const hashedAndEncryptedPassword = CryptoService.cryptoProvider.encryptPasswordHash(password.value, encryptedSalt);
    const hashedPassword = CryptoService.instance.decryptText(hashedAndEncryptedPassword);

    const expectedHashedPassword = crypto
      .pbkdf2Sync(password.value, password.salt, 10000, 256 / 8, 'sha256')
      .toString('hex');

    expect(hashedPassword).to.be.equal(expectedHashedPassword);
    expect(spyConfigService).to.be.calledWith(envEndpoint.key);
  });

  it('When a password is hashed using passToHash without salt, then it is hashed with a new generated salt', () => {
    const password = crypto.randomBytes(16).toString('hex');

    const hashedPassword = CryptoService.instance.passToHash({ password });

    expect(hashedPassword.hash.length).to.be.equal(64);
    expect(hashedPassword.salt.length).to.be.equal(32);
  });

  it('When auth keys are generated using CryptoProvider, then they are generated using KeysService', async () => {
    const password = crypto.randomBytes(8).toString('hex');
    const keysReturned = {
      privateKeyArmored: crypto.randomBytes(16).toString('hex'),
      privateKeyArmoredEncrypted: crypto.randomBytes(16).toString('hex'),
      publicKeyArmored: crypto.randomBytes(16).toString('hex'),
      revocationCertificate: crypto.randomBytes(16).toString('hex'),
    };

    const kerysServiceStub = cryptoServiceSandbox
      .stub(KeysService.instance, 'generateNewKeysWithEncrypted')
      .returns(Promise.resolve(keysReturned));

    const expectedKeys: Keys = {
      privateKeyEncrypted: keysReturned.privateKeyArmoredEncrypted,
      publicKey: keysReturned.publicKeyArmored,
      revocationCertificate: keysReturned.revocationCertificate,
    };

    const resultedKeys = await CryptoService.cryptoProvider.generateKeys(password);

    expect(expectedKeys).to.be.eql(resultedKeys);
    expect(kerysServiceStub).to.be.calledWith(password);
  });
});
