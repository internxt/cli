import { expect } from 'chai';
import sinon, { SinonSandbox } from 'sinon';
import crypto from 'crypto';
import { aes } from '@internxt/lib';
import * as openpgp from 'openpgp';
import { KeysService } from '../../src/services/keys.service';
import { ConfigService } from '../../src/services/config.service';
import { AesInit, CorruptedEncryptedPrivateKeyError } from '../../src/types/keys.types';

import { config } from 'dotenv';
config();

describe('Keys service', () => {
  let keysServiceSandbox: SinonSandbox;

  const aesInit: AesInit = {
    iv: crypto.randomBytes(16).toString('hex'),
    salt: crypto.randomBytes(64).toString('hex'),
  };

  beforeEach(() => {
    keysServiceSandbox = sinon.createSandbox();
  });

  afterEach(function () {
    keysServiceSandbox.restore();
  });

  it('When public and private keys are validated, then there is no error thrown', async () => {
    keysServiceSandbox.stub(openpgp, 'readKey').resolves();
    keysServiceSandbox.stub(openpgp, 'readPrivateKey').resolves();
    keysServiceSandbox.stub(openpgp, 'createMessage').resolves();
    keysServiceSandbox.stub(openpgp, 'encrypt').resolves();
    keysServiceSandbox.stub(openpgp, 'readMessage').resolves();
    keysServiceSandbox
      .stub(openpgp, 'decrypt')
      .returns(
        Promise.resolve({ data: 'validate-keys' } as openpgp.DecryptMessageResult & {
          data: openpgp.MaybeStream<string>;
        }),
      );

    await KeysService.instance.assertValidateKeys('dontcareprivate', 'dontcarepublic');
    expect(true).to.be.true; //checks that assertValidateKeys does not throw any error
  });

  it('When public and private keys are not valid, then the validation throws an error', async () => {
    try {
      await KeysService.instance.assertValidateKeys('privateKey', 'publickey');
      expect(false).to.be.true; //should throw error
    } catch {
      /* no op */
    }
  });

  it('When there is no error thrown at decryption but it is not working, then the validation throws an error', async () => {
    keysServiceSandbox.stub(openpgp, 'readKey').resolves();
    keysServiceSandbox.stub(openpgp, 'readPrivateKey').resolves();
    keysServiceSandbox.stub(openpgp, 'createMessage').resolves();
    keysServiceSandbox.stub(openpgp, 'encrypt').resolves();
    keysServiceSandbox.stub(openpgp, 'readMessage').resolves();
    keysServiceSandbox.stub(openpgp, 'decrypt').resolves();
    //every dependency method resolves (no error thrown), but nothing should be encrypted/decrypted, so the result should not be valid
    try {
      await KeysService.instance.assertValidateKeys('dontcareprivate', 'dontcarepublic');
      expect(false).to.be.true; //should throw error
    } catch (err) {
      const error = err as Error;
      expect(error.message).to.equal('Keys do not match');
    }
  });

  it('When keys do not match, then it throws a KeysDoNotMatchError', async () => {
    keysServiceSandbox.stub(openpgp, 'readKey').resolves();
    keysServiceSandbox.stub(openpgp, 'readPrivateKey').resolves();
    keysServiceSandbox.stub(openpgp, 'createMessage').resolves();
    keysServiceSandbox.stub(openpgp, 'encrypt').resolves();
    keysServiceSandbox.stub(openpgp, 'readMessage').resolves();
    keysServiceSandbox.stub(openpgp, 'decrypt').rejects();

    //decrypt method throws an exception as it can not decrypt the message (public and private keys do not match)
    try {
      await KeysService.instance.assertValidateKeys('dontcareprivate', 'dontcarepublic');
      expect(false).to.be.true; //should throw error
    } catch (err) {
      const error = err as Error;
      expect(error.message).to.equal('Keys do not match');
    }
  });

  it('When private key is encrypted with a password and it is validated, then there is no error thrown', async () => {
    const plainPrivateKey = crypto.randomBytes(16).toString('hex');
    const password = crypto.randomBytes(8).toString('hex');

    const encryptedPrivateKey = aes.encrypt(plainPrivateKey, password, aesInit);

    keysServiceSandbox.stub(KeysService.instance, 'decryptPrivateKey').resolves();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keysServiceSandbox.stub(KeysService.instance, <any>'isValidKey').returns(Promise.resolve(true));

    await KeysService.instance.assertPrivateKeyIsValid(encryptedPrivateKey, password);

    expect(true).to.be.true; //checks that assertPrivateKeyIsValid does not throw any error
  });

  it('When private key is encrypted with bad iterations, then it throws a WrongIterationsToEncryptPrivateKey error', async () => {
    const plainPrivateKey = crypto.randomBytes(16).toString('hex');
    const password = crypto.randomBytes(8).toString('hex');

    const badEncryptionPrivateKey = aes.encrypt(plainPrivateKey, password, aesInit, 9999);

    keysServiceSandbox.stub(KeysService.instance, 'decryptPrivateKey').rejects();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keysServiceSandbox.stub(KeysService.instance, <any>'isValidKey').returns(Promise.resolve(true));

    try {
      await KeysService.instance.assertPrivateKeyIsValid(badEncryptionPrivateKey, password);
      expect(false).to.be.true; //should throw error
    } catch (err) {
      const error = err as Error;
      expect(error.message).to.equal('Private key was encrypted using the wrong iterations number');
    }
  });

  it('When private key is badly encrypted, then it throws a CorruptedEncryptedPrivateKey error', async () => {
    const plainPrivateKey = crypto.randomBytes(16).toString('hex');
    const password = crypto.randomBytes(8).toString('hex');

    const badEncryptionPrivateKey = aes.encrypt(plainPrivateKey, password, aesInit);

    keysServiceSandbox
      .stub(KeysService.instance, 'decryptPrivateKey')
      .throwsException(CorruptedEncryptedPrivateKeyError);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keysServiceSandbox.stub(KeysService.instance, <any>'isValidKey').returns(Promise.resolve(false));

    try {
      await KeysService.instance.assertPrivateKeyIsValid(badEncryptionPrivateKey, password);
      expect(false).to.be.true; //should throw error
    } catch (err) {
      const error = err as Error;
      expect(error.message).to.equal('Private key is corrupted');
    }
  });

  it('When private key is bad encoded, then it throws a BadEncodedPrivateKey error', async () => {
    const plainPrivateKey = crypto.randomBytes(16).toString('hex');
    const password = crypto.randomBytes(8).toString('hex');

    const badEncodedPrivateKey = aes.encrypt(plainPrivateKey, password, aesInit);

    keysServiceSandbox.stub(KeysService.instance, 'decryptPrivateKey').resolves();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keysServiceSandbox.stub(KeysService.instance, <any>'isValidKey').returns(Promise.resolve(false));

    try {
      await KeysService.instance.assertPrivateKeyIsValid(badEncodedPrivateKey, password);
      expect(false).to.be.true; //should throw error
    } catch (err) {
      const error = err as Error;
      expect(error.message).to.equal('Private key is bad encoded');
    }
  });

  it('When the key is not valid, then isValid method returns false', async () => {
    keysServiceSandbox.stub(openpgp, 'readKey').rejects();

    expect(await KeysService.instance.isValidKey('key')).to.be.false;
  });

  it('When the key is valid, then isValid method returns true', async () => {
    keysServiceSandbox.stub(openpgp, 'readKey').resolves();

    expect(await KeysService.instance.isValidKey('key')).to.be.true;
  });

  it('When aes information is required, then it is read from the config service', async () => {
    const configServiceInstanceStub = keysServiceSandbox.stub(ConfigService.instance, 'get');
    configServiceInstanceStub.withArgs('APP_MAGIC_IV').returns(aesInit.iv);
    configServiceInstanceStub.withArgs('APP_MAGIC_SALT').returns(aesInit.salt);

    const result = KeysService.instance.getAesInitFromEnv();
    expect(result).to.eql(aesInit);
  });

  it('When message is encrypted with private key & password, then it can be decrypted using same data', async () => {
    const plainPrivateKey = crypto.randomBytes(16).toString('hex');
    const password = crypto.randomBytes(8).toString('hex');

    const configServiceInstanceStub = keysServiceSandbox.stub(ConfigService.instance, 'get');
    configServiceInstanceStub.withArgs('APP_MAGIC_IV').returns(aesInit.iv);
    configServiceInstanceStub.withArgs('APP_MAGIC_SALT').returns(aesInit.salt);

    const encryptedPrivateKey = KeysService.instance.encryptPrivateKey(plainPrivateKey, password);
    const decryptedPrivateKey = KeysService.instance.decryptPrivateKey(encryptedPrivateKey, password);

    expect(decryptedPrivateKey).to.equal(plainPrivateKey);
  });

  it('When new pgp keys are required, then it generates them from the openpgp library', async () => {
    const pgpKeys = {
      privateKey: crypto.randomBytes(16).toString('hex'),
      publicKey: crypto.randomBytes(16).toString('hex'),
      revocationCertificate: crypto.randomBytes(16).toString('hex'),
    } as unknown as openpgp.KeyPair & { revocationCertificate: string };

    const pgpKeysWithEncrypted = {
      privateKeyArmored: pgpKeys.privateKey,
      privateKeyArmoredEncrypted: crypto.randomBytes(16).toString('hex'),
      publicKeyArmored: Buffer.from(pgpKeys.publicKey as unknown as string).toString('base64'),
      revocationCertificate: Buffer.from(pgpKeys.revocationCertificate).toString('base64'),
    };

    const password = crypto.randomBytes(8).toString('hex');

    keysServiceSandbox.stub(openpgp, 'generateKey').returns(Promise.resolve(pgpKeys));
    keysServiceSandbox
      .stub(KeysService.instance, 'encryptPrivateKey')
      .returns(pgpKeysWithEncrypted.privateKeyArmoredEncrypted);

    const newKeys = await KeysService.instance.generateNewKeysWithEncrypted(password);

    expect(newKeys).to.eql(pgpKeysWithEncrypted);
  });
});
