import { expect } from 'chai';
import express from 'express';
import sinon from 'sinon';
import { randomBytes, randomInt } from 'crypto';
import https from 'https';
import { ConfigService } from '../../src/services/config.service';
import { DriveFolderService } from '../../src/services/drive/drive-folder.service';
import { WebDavServer } from '../../src/webdav/webdav-server';
import { getDriveDatabaseManager } from '../fixtures/drive-database.fixture';
import { UploadService } from '../../src/services/network/upload.service';
import { DriveFileService } from '../../src/services/drive/drive-file.service';
import { DownloadService } from '../../src/services/network/download.service';
import { AuthService } from '../../src/services/auth.service';
import { CryptoService } from '../../src/services/crypto.service';
import { ConfigKeys } from '../../src/types/config.types';
import { NetworkUtils } from '../../src/utils/network.utils';

describe('WebDav server', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it('When the WebDav server is started, it should generate self-signed certificates', () => {
    const envEndpoint: { key: keyof ConfigKeys; value: string } = {
      key: 'WEBDAV_SERVER_PORT',
      value: randomInt(65535).toString(),
    };
    const sslSelfSigned = {
      private: randomBytes(8).toString('hex'),
      public: randomBytes(8).toString('hex'),
      cert: randomBytes(8).toString('hex'),
      fingerprint: randomBytes(8).toString('hex'),
    };

    sandbox.stub(ConfigService.instance, 'get').withArgs(envEndpoint.key).returns(envEndpoint.value);
    // @ts-expect-error - We stub the method partially
    const createServerStub = sandbox.stub(https, 'createServer').returns({
      listen: sandbox.stub().resolves(),
    });
    sandbox.stub(NetworkUtils, 'getWebdavSSLCerts').returns({ cert: sslSelfSigned.cert, key: sslSelfSigned.private });

    const app = express();
    const server = new WebDavServer(
      app,
      ConfigService.instance,
      DriveFileService.instance,
      DriveFolderService.instance,
      getDriveDatabaseManager(),
      UploadService.instance,
      DownloadService.instance,
      AuthService.instance,
      CryptoService.instance,
    );
    server.start();

    expect(createServerStub).to.be.calledOnceWith({ cert: sslSelfSigned.cert, key: sslSelfSigned.private });
  });
});
