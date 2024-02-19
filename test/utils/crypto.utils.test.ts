import { expect } from 'chai';
import { CryptoUtils } from '../../src/utils/crypto.utils';
import sinon from 'sinon';
import { ConfigService } from '../../src/services/config.service';
import { AesInit } from '../../src/types/keys.types';
import crypto from 'node:crypto';
describe('Crypto utils', () => {
  const sandbox = sinon.createSandbox();
  const aesInit: AesInit = {
    iv: crypto.randomBytes(16).toString('hex'),
    salt: crypto.randomBytes(64).toString('hex'),
  };
  it('When Magic IV or Magic Salt are missing should throw an error', async () => {
    try {
      CryptoUtils.getAesInit();
      expect(true).to.be.true;
    } catch {
      // Noop
    }
  });

  it('When aes information is required, then it is read from the config service', async () => {
    const configServiceInstanceStub = sandbox.stub(ConfigService.instance, 'get');
    configServiceInstanceStub.withArgs('APP_MAGIC_IV').returns(aesInit.iv);
    configServiceInstanceStub.withArgs('APP_MAGIC_SALT').returns(aesInit.salt);

    const result = CryptoUtils.getAesInit();
    expect(result).to.eql(aesInit);
  });
});
