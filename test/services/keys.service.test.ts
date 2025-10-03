import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import * as openpgp from 'openpgp';
import { KeysService } from '../../src/services/keys.service';
import { ConfigService } from '../../src/services/config.service';
import { AesInit } from '../../src/types/keys.types';

vi.mock('openpgp', { spy: true });

describe('Keys service', () => {
  const aesInit: AesInit = {
    iv: crypto.randomBytes(16).toString('hex'),
    salt: crypto.randomBytes(64).toString('hex'),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
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
    interface KeyPair {
      privateKey: openpgp.PrivateKey;
      publicKey: openpgp.PublicKey;
    }

    const pgpKeys = {
      privateKey: crypto.randomBytes(16).toString('hex'),
      publicKey: crypto.randomBytes(16).toString('hex'),
      revocationCertificate: crypto.randomBytes(16).toString('hex'),
    } as unknown as KeyPair & { revocationCertificate: string };

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
