import { expect } from 'chai';
import sinon, { SinonSandbox } from 'sinon';
import crypto from 'crypto';
import { aes } from '@internxt/lib';
import * as openpgp from 'openpgp';
import { KeysService } from '../../src/services/keys.service';
import { ConfigService } from '../../src/services/config.service';
import { AesInit, CorruptedEncryptedPrivateKeyError } from '../../src/types/keys.types';
import { fail } from 'assert';

describe('Keys service', () => {
  let keysServiceSandbox: SinonSandbox;

  const aesInit: AesInit = {
    iv: crypto.randomBytes(16).toString('hex'),
    salt: crypto.randomBytes(64).toString('hex'),
  };

  beforeEach(() => {
    keysServiceSandbox = sinon.createSandbox();
  });

  afterEach(() => {
    keysServiceSandbox.restore();
  });

  it('When public and private keys are validated, then there is no error thrown', async () => {
    keysServiceSandbox.stub(openpgp, 'readKey').resolves();
    keysServiceSandbox.stub(openpgp, 'readPrivateKey').resolves();
    keysServiceSandbox.stub(openpgp, 'createMessage').resolves();
    keysServiceSandbox.stub(openpgp, 'encrypt').resolves();
    keysServiceSandbox.stub(openpgp, 'readMessage').resolves();
    keysServiceSandbox.stub(openpgp, 'decrypt').resolves({ data: 'validate-keys' } as openpgp.DecryptMessageResult & {
      data: openpgp.MaybeStream<string>;
    });

    await KeysService.instance.assertValidateKeys('dontcareprivate', 'dontcarepublic');
  });

  it('When public and private keys are not valid, then the validation throws an error', async () => {
    try {
      await KeysService.instance.assertValidateKeys('privateKey', 'publickey');
      fail('Expected function to throw an error, but it did not.');
    } catch {
      /* no op */
    }
  });

  it('When keys can be used to decrypt but they are not working good to encrypt/decrypt, then the validation throws an error', async () => {
    keysServiceSandbox.stub(openpgp, 'readKey').resolves();
    keysServiceSandbox.stub(openpgp, 'readPrivateKey').resolves();
    keysServiceSandbox.stub(openpgp, 'createMessage').resolves();
    keysServiceSandbox.stub(openpgp, 'encrypt').resolves();
    keysServiceSandbox.stub(openpgp, 'readMessage').resolves();
    keysServiceSandbox.stub(openpgp, 'decrypt').resolves({ data: 'bad-validation' } as openpgp.DecryptMessageResult & {
      data: openpgp.MaybeStream<string>;
    });
    //every dependency method resolves (no error thrown), but nothing should be encrypted/decrypted, so the result should not be valid
    try {
      await KeysService.instance.assertValidateKeys('dontcareprivate', 'dontcarepublic');
      fail('Expected function to throw an error, but it did not.');
    } catch (err) {
      const error = err as Error;
      expect(error.message).to.equal('Keys do not match');
    }
  });

  it('When encryption fails, then it throws an error', async () => {
    keysServiceSandbox.stub(openpgp, 'readKey').resolves();
    keysServiceSandbox.stub(openpgp, 'readPrivateKey').resolves();
    keysServiceSandbox.stub(openpgp, 'createMessage').resolves();
    keysServiceSandbox.stub(openpgp, 'encrypt').rejects(new Error('Encryption failed'));
    keysServiceSandbox.stub(openpgp, 'readMessage').resolves();
    keysServiceSandbox.stub(openpgp, 'decrypt').resolves();

    //encrypt method throws an exception as it can not encrypt the message (something with the encryptionKeys is bad)
    try {
      await KeysService.instance.assertValidateKeys('dontcareprivate', 'dontcarepublic');
      expect(false).to.be.true; //should throw error
    } catch (err) {
      const error = err as Error;
      expect(error.message).to.equal('Encryption failed');
    }
  });

  it('When decryption fails, then it throws an error', async () => {
    keysServiceSandbox.stub(openpgp, 'readKey').resolves();
    keysServiceSandbox.stub(openpgp, 'readPrivateKey').resolves();
    keysServiceSandbox.stub(openpgp, 'createMessage').resolves();
    keysServiceSandbox.stub(openpgp, 'encrypt').resolves();
    keysServiceSandbox.stub(openpgp, 'readMessage').resolves();
    keysServiceSandbox.stub(openpgp, 'decrypt').rejects(new Error('Decryption failed'));

    //decrypt method throws an exception as it can not decrypt the message (something with the decryptionKeys is bad)
    try {
      await KeysService.instance.assertValidateKeys('dontcareprivate', 'dontcarepublic');
      expect(false).to.be.true; //should throw error
    } catch (err) {
      const error = err as Error;
      expect(error.message).to.equal('Decryption failed');
    }
  });

  it('When private key is encrypted with a password and it is validated, then there is no error thrown', async () => {
    const plainPrivateKey = crypto.randomBytes(16).toString('hex');
    const password = crypto.randomBytes(8).toString('hex');

    const encryptedPrivateKey = aes.encrypt(plainPrivateKey, password, aesInit);

    keysServiceSandbox.stub(KeysService.instance, 'decryptPrivateKey').resolves();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keysServiceSandbox.stub(KeysService.instance, <any>'isValidKey').resolves(true);

    await KeysService.instance.assertPrivateKeyIsValid(encryptedPrivateKey, password);
  });

  it('When private key is encrypted with bad iterations, then it throws a WrongIterationsToEncryptPrivateKey error', async () => {
    const plainPrivateKey = crypto.randomBytes(16).toString('hex');
    const password = crypto.randomBytes(8).toString('hex');

    const badEncryptionPrivateKey = aes.encrypt(plainPrivateKey, password, aesInit, 9999);

    keysServiceSandbox.stub(KeysService.instance, 'decryptPrivateKey').rejects();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    keysServiceSandbox.stub(KeysService.instance, <any>'isValidKey').resolves(true);

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
    keysServiceSandbox.stub(KeysService.instance, <any>'isValidKey').resolves(false);

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
    keysServiceSandbox.stub(KeysService.instance, <any>'isValidKey').resolves(false);

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
      publicKeyArmored: Buffer.from(String(pgpKeys.publicKey)).toString('base64'),
      revocationCertificate: Buffer.from(pgpKeys.revocationCertificate).toString('base64'),
    };

    const password = crypto.randomBytes(8).toString('hex');

    keysServiceSandbox.stub(openpgp, 'generateKey').resolves(pgpKeys);
    keysServiceSandbox
      .stub(KeysService.instance, 'encryptPrivateKey')
      .returns(pgpKeysWithEncrypted.privateKeyArmoredEncrypted);

    const newKeys = await KeysService.instance.generateNewKeysWithEncrypted(password);

    expect(newKeys).to.eql(pgpKeysWithEncrypted);
  });
});
