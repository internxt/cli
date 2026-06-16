import { describe, expect, test, vi } from 'vitest';
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

  test('when encryption settings are missing, then an error is thrown', () => {
    try {
      CryptoUtils.getAesInit();
      fail('Expected function to throw an error, but it did not.');
    } catch {
      // noop
    }
  });

  test('when encryption settings are requested, then they are retrieved from storage', async () => {
    const configServiceInstancespyOn = vi.spyOn(ConfigService.instance, 'get');
    configServiceInstancespyOn.mockReturnValueOnce(aesInit.iv);
    configServiceInstancespyOn.mockReturnValueOnce(aesInit.salt);

    const result = CryptoUtils.getAesInit();
    expect(result).to.be.deep.equal(aesInit);
  });
});
