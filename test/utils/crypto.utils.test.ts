import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import { CryptoUtils } from '../../src/utils/crypto.utils';
import { ConfigService } from '../../src/services/config.service';
import { AesInit } from '../../src/types/keys.types';
import { fail } from 'node:assert';

describe('Crypto utils', () => {
  const aesInit: AesInit = {
    iv: crypto.randomBytes(16).toString('hex'),
    salt: crypto.randomBytes(64).toString('hex'),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When Magic IV or Magic Salt are missing should throw an error', () => {
    try {
      CryptoUtils.getAesInit();
      fail('Expected function to throw an error, but it did not.');
    } catch {
      // noop
    }
  });

  it('When aes information is required, then it is read from the config service', async () => {
    const configServiceInstancespyOn = vi.spyOn(ConfigService.instance, 'get');
    configServiceInstancespyOn.mockReturnValueOnce(aesInit.iv);
    configServiceInstancespyOn.mockReturnValueOnce(aesInit.salt);

    const result = CryptoUtils.getAesInit();
    expect(result).to.be.deep.equal(aesInit);
  });
});
