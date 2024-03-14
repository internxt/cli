import { expect } from 'chai';
import Sinon, { SinonSandbox } from 'sinon';
import fs from 'fs';
import { randomBytes } from 'crypto';
import selfsigned from 'selfsigned';
import { NetworkUtils } from '../../src/utils/network.utils';

describe('Network utils', () => {
  let networkUtilsSandbox: SinonSandbox;

  beforeEach(() => {
    networkUtilsSandbox = Sinon.createSandbox();
  });

  afterEach(() => {
    networkUtilsSandbox.restore();
  });

  it('When obtaining auth credentials, should return the password as a SHA256 hash', async () => {
    const result = NetworkUtils.getAuthFromCredentials({
      user: 'test',
      pass: 'password123!',
    });

    expect(result.password).to.be.equal('5751a44782594819e4cb8aa27c2c9d87a420af82bc6a5a05bc7f19c3bb00452b');
  });

  it('When webdav ssl certs are required but they dont exist, then they are generated and self signed on the fly, and they are also saved to files', async () => {
    const sslSelfSigned: selfsigned.GenerateResult = {
      private: randomBytes(8).toString('hex'),
      public: randomBytes(8).toString('hex'),
      cert: randomBytes(8).toString('hex'),
      fingerprint: randomBytes(8).toString('hex'),
    };
    networkUtilsSandbox.stub(fs, 'existsSync').returns(false);

    const stubGerateSelfsignedCerts = networkUtilsSandbox
      .stub(selfsigned, 'generate')
      // @ts-expect-error - We stub the stat method partially
      .returns(sslSelfSigned);

    const stubSaveCerts = networkUtilsSandbox.stub(fs, 'writeFileSync').returns();

    networkUtilsSandbox.stub(fs, 'readFileSync').rejects();

    const result = NetworkUtils.getWebdavSSLCerts();

    expect(result).to.deep.equal({ cert: sslSelfSigned.cert, key: sslSelfSigned.private });
    expect(stubGerateSelfsignedCerts.calledOnce).to.be.true;
    expect(stubSaveCerts.calledTwice).to.be.true;
  });
});
