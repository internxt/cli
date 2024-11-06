import { expect } from 'chai';
import Sinon, { SinonSandbox } from 'sinon';
import fs from 'fs';
import crypto, { randomBytes } from 'crypto';
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

  it('When webdav ssl certs are required but they exist, then they are read from the files', async () => {
    const sslMock = {
      private: randomBytes(8).toString('hex'),
      cert: randomBytes(8).toString('hex'),
    };
    networkUtilsSandbox.stub(fs, 'existsSync').returns(true);
    networkUtilsSandbox.stub(fs, 'writeFileSync').rejects();

    networkUtilsSandbox
      .stub(fs, 'readFileSync')
      .withArgs(NetworkUtils.WEBDAV_SSL_CERTS_PATH.cert)
      .returns(sslMock.cert)
      .withArgs(NetworkUtils.WEBDAV_SSL_CERTS_PATH.privateKey)
      .returns(sslMock.private);
    const future = new Date();
    future.setDate(future.getDate() + 1);
    networkUtilsSandbox.stub(crypto, 'X509Certificate').returns({ validTo: future });

    const result = NetworkUtils.getWebdavSSLCerts();

    expect(result).to.deep.equal({ cert: sslMock.cert, key: sslMock.private });
  });

  it('When webdav ssl certs are required and they exist, but they are expired, then they are generated and saved to files', async () => {
    const sslSelfSigned: selfsigned.GenerateResult = {
      private: randomBytes(8).toString('hex'),
      public: randomBytes(8).toString('hex'),
      cert: randomBytes(8).toString('hex'),
      fingerprint: randomBytes(8).toString('hex'),
    };
    const sslMock = {
      private: randomBytes(8).toString('hex'),
      cert: randomBytes(8).toString('hex'),
    };
    networkUtilsSandbox.stub(fs, 'existsSync').returns(true);
    const stubSaveCerts = networkUtilsSandbox.stub(fs, 'writeFileSync').returns();

    networkUtilsSandbox
      .stub(fs, 'readFileSync')
      .withArgs(NetworkUtils.WEBDAV_SSL_CERTS_PATH.cert)
      .returns(sslMock.cert)
      .withArgs(NetworkUtils.WEBDAV_SSL_CERTS_PATH.privateKey)
      .returns(sslMock.private);
    const past = new Date();
    past.setDate(past.getDate() - 1);
    networkUtilsSandbox.stub(crypto, 'X509Certificate').returns({ validTo: past });

    const stubGerateSelfsignedCerts = networkUtilsSandbox
      .stub(selfsigned, 'generate')
      // @ts-expect-error - We stub the stat method partially
      .returns(sslSelfSigned);

    const result = NetworkUtils.getWebdavSSLCerts();

    expect(result).to.deep.equal({ cert: sslSelfSigned.cert, key: sslSelfSigned.private });
    expect(stubGerateSelfsignedCerts.calledOnce).to.be.true;
    expect(stubSaveCerts.calledTwice).to.be.true;
  });
});
