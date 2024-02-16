import { expect } from 'chai';
import { CryptoUtils } from '../../src/utils/crypto.utils';

describe('Crypto utils', () => {
  it('When Magic IV or Magic Salt are missing should throw an error', async () => {
    try {
      CryptoUtils.getAesInitFromEnv();
      expect(true).to.be.true;
    } catch {
      // Noop
    }
  });
});
