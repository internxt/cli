import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import { aes } from '@internxt/lib';
import * as openpgp from 'openpgp';
import { KeysService } from '../../src/services/keys.service';
import { ConfigService } from '../../src/services/config.service';
import { AesInit, CorruptedEncryptedPrivateKeyError } from '../../src/types/keys.types';
import { fail } from 'node:assert';

describe('Keys service', () => {
  const aesInit: AesInit = {
    iv: crypto.randomBytes(16).toString('hex'),
    salt: crypto.randomBytes(64).toString('hex'),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When public and private keys are validated, then there is no error thrown', async () => {
    vi.spyOn(openpgp, 'readKey').mockResolvedValue({} as openpgp.Key);
    vi.spyOn(openpgp, 'readPrivateKey').mockResolvedValue({} as openpgp.PrivateKey);
    vi.spyOn(openpgp, 'createMessage').mockResolvedValue({} as openpgp.Message<openpgp.MaybeStream<Uint8Array>>);
    vi.spyOn(openpgp, 'encrypt').mockResolvedValue({} as openpgp.Message<openpgp.MaybeStream<openpgp.Data>>);
    vi.spyOn(openpgp, 'readMessage').mockResolvedValue({} as openpgp.Message<openpgp.MaybeStream<Uint8Array>>);
    vi.spyOn(openpgp, 'decrypt').mockResolvedValue({ data: 'validate-keys' } as openpgp.DecryptMessageResult & {
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

  it('When keys are not working good to encrypt/decrypt, then the validation throws an error', async () => {
    vi.spyOn(openpgp, 'readKey').mockResolvedValue({} as openpgp.Key);
    vi.spyOn(openpgp, 'readPrivateKey').mockResolvedValue({} as openpgp.PrivateKey);
    vi.spyOn(openpgp, 'createMessage').mockResolvedValue({} as openpgp.Message<openpgp.MaybeStream<Uint8Array>>);
    vi.spyOn(openpgp, 'encrypt').mockResolvedValue({} as openpgp.Message<openpgp.MaybeStream<openpgp.Data>>);
    vi.spyOn(openpgp, 'readMessage').mockResolvedValue({} as openpgp.Message<openpgp.MaybeStream<Uint8Array>>);
    vi.spyOn(openpgp, 'decrypt').mockResolvedValue({ data: 'bad-validation' } as openpgp.DecryptMessageResult & {
      data: openpgp.MaybeStream<string>;
    });
    //every dependency method mockResolvedValue (no error thrown), but nothing should be encrypted/decrypted, so the result should not be valid
    try {
      await KeysService.instance.assertValidateKeys('dontcareprivate', 'dontcarepublic');
      fail('Expected function to throw an error, but it did not.');
    } catch (err) {
      const error = err as Error;
      expect(error.message).to.be.equal('Keys do not match');
    }
  });

  it('When encryption fails, then it throws an error', async () => {
    vi.spyOn(openpgp, 'readKey').mockResolvedValue({} as openpgp.Key);
    vi.spyOn(openpgp, 'readPrivateKey').mockResolvedValue({} as openpgp.PrivateKey);
    vi.spyOn(openpgp, 'createMessage').mockResolvedValue({} as openpgp.Message<openpgp.MaybeStream<Uint8Array>>);
    vi.spyOn(openpgp, 'encrypt').mockRejectedValue(new Error('Encryption failed'));
    vi.spyOn(openpgp, 'readMessage').mockResolvedValue({} as openpgp.Message<openpgp.MaybeStream<Uint8Array>>);
    vi.spyOn(openpgp, 'decrypt').mockResolvedValue(
      {} as openpgp.DecryptMessageResult & {
        data: openpgp.MaybeStream<string>;
      },
    );

    //encrypt method throws an exception as it can not encrypt the message (something with the encryptionKeys is bad)
    try {
      await KeysService.instance.assertValidateKeys('dontcareprivate', 'dontcarepublic');
      fail('Expected function to throw an error, but it did not.');
    } catch (err) {
      const error = err as Error;
      expect(error.message).to.be.equal('Encryption failed');
    }
  });

  it('When decryption fails, then it throws an error', async () => {
    vi.spyOn(openpgp, 'readKey').mockResolvedValue({} as openpgp.Key);
    vi.spyOn(openpgp, 'readPrivateKey').mockResolvedValue({} as openpgp.PrivateKey);
    vi.spyOn(openpgp, 'createMessage').mockResolvedValue({} as openpgp.Message<openpgp.MaybeStream<Uint8Array>>);
    vi.spyOn(openpgp, 'encrypt').mockResolvedValue({} as openpgp.Message<openpgp.MaybeStream<openpgp.Data>>);
    vi.spyOn(openpgp, 'readMessage').mockResolvedValue({} as openpgp.Message<openpgp.MaybeStream<Uint8Array>>);
    vi.spyOn(openpgp, 'decrypt').mockRejectedValue(new Error('Decryption failed'));

    //decrypt method throws an exception as it can not decrypt the message (something with the decryptionKeys is bad)
    try {
      await KeysService.instance.assertValidateKeys('dontcareprivate', 'dontcarepublic');
      fail('Expected function to throw an error, but it did not.');
    } catch (err) {
      const error = err as Error;
      expect(error.message).to.be.equal('Decryption failed');
    }
  });

  it('When private key is encrypted with a password and it is validated, then there is no error thrown', async () => {
    const plainPrivateKey = crypto.randomBytes(16).toString('hex');
    const password = crypto.randomBytes(8).toString('hex');

    const encryptedPrivateKey = aes.encrypt(plainPrivateKey, password, aesInit);

    vi.spyOn(KeysService.instance, 'decryptPrivateKey').mockReturnValue('');
    vi.spyOn(KeysService.instance, 'isValidKey').mockResolvedValue(true);

    await KeysService.instance.assertPrivateKeyIsValid(encryptedPrivateKey, password);
  });

  it('When private key is encrypted with bad iterations, then it should throw an error', async () => {
    const plainPrivateKey = crypto.randomBytes(16).toString('hex');
    const password = crypto.randomBytes(8).toString('hex');

    const badEncryptionPrivateKey = aes.encrypt(plainPrivateKey, password, aesInit, 9999);

    vi.spyOn(KeysService.instance, 'decryptPrivateKey').mockImplementation(() => {
      throw new Error();
    });
    vi.spyOn(KeysService.instance, 'isValidKey').mockResolvedValue(true);

    try {
      await KeysService.instance.assertPrivateKeyIsValid(badEncryptionPrivateKey, password);
      fail('Expected function to throw an error, but it did not.');
    } catch (err) {
      const error = err as Error;
      expect(error.message).to.be.equal('Private key was encrypted using the wrong iterations number');
    }
  });

  it('When private key is badly encrypted, then it throws a CorruptedEncryptedPrivateKey error', async () => {
    const plainPrivateKey = crypto.randomBytes(16).toString('hex');
    const password = crypto.randomBytes(8).toString('hex');

    const badEncryptionPrivateKey = aes.encrypt(plainPrivateKey, password, aesInit);

    vi.spyOn(KeysService.instance, 'decryptPrivateKey').mockImplementation(() => {
      throw new CorruptedEncryptedPrivateKeyError();
    });
    vi.spyOn(KeysService.instance, 'isValidKey').mockResolvedValue(false);

    try {
      await KeysService.instance.assertPrivateKeyIsValid(badEncryptionPrivateKey, password);
      fail('Expected function to throw an error, but it did not.');
    } catch (err) {
      const error = err as Error;
      expect(error.message).to.be.equal('Private key is corrupted');
    }
  });

  it('When private key is bad encoded, then it throws a BadEncodedPrivateKey error', async () => {
    const plainPrivateKey = crypto.randomBytes(16).toString('hex');
    const password = crypto.randomBytes(8).toString('hex');

    const badEncodedPrivateKey = aes.encrypt(plainPrivateKey, password, aesInit);

    vi.spyOn(KeysService.instance, 'decryptPrivateKey').mockReturnValue(plainPrivateKey);
    vi.spyOn(KeysService.instance, 'isValidKey').mockResolvedValue(false);

    try {
      await KeysService.instance.assertPrivateKeyIsValid(badEncodedPrivateKey, password);
      fail('Expected function to throw an error, but it did not.');
    } catch (err) {
      const error = err as Error;
      expect(error.message).to.be.equal('Private key is bad encoded');
    }
  });

  it('When the key is not valid, then isValid method returns false', async () => {
    vi.spyOn(openpgp, 'readKey').mockRejectedValue(new Error());

    expect(await KeysService.instance.isValidKey('key')).to.be.equal(false);
  });

  it('When the key is valid, then isValid method returns true', async () => {
    vi.spyOn(openpgp, 'readKey').mockResolvedValue({} as openpgp.Key);

    expect(await KeysService.instance.isValidKey('key')).to.be.equal(true);
  });

  it('When message is encrypted with private key & password, then it can be decrypted using same data', async () => {
    const plainPrivateKey = crypto.randomBytes(16).toString('hex');
    const password = crypto.randomBytes(8).toString('hex');

    const configServiceInstancespyOn = vi.spyOn(ConfigService.instance, 'get');
    configServiceInstancespyOn.mockReturnValueOnce(aesInit.iv);
    configServiceInstancespyOn.mockReturnValueOnce(aesInit.salt);

    const encryptedPrivateKey = KeysService.instance.encryptPrivateKey(plainPrivateKey, password);
    const decryptedPrivateKey = KeysService.instance.decryptPrivateKey(encryptedPrivateKey, password);

    expect(decryptedPrivateKey).to.be.equal(plainPrivateKey);
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

    vi.spyOn(openpgp, 'generateKey').mockResolvedValue(pgpKeys);
    vi.spyOn(KeysService.instance, 'encryptPrivateKey').mockReturnValue(
      pgpKeysWithEncrypted.privateKeyArmoredEncrypted,
    );

    const newKeys = await KeysService.instance.generateNewKeysWithEncrypted(password);

    expect(newKeys).to.be.deep.equal(pgpKeysWithEncrypted);
  });
});
