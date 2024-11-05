import { expect } from 'chai';
import express from 'express';
import sinon from 'sinon';
import { randomBytes, randomInt } from 'crypto';
import http from 'http';
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
import { NetworkUtils } from '../../src/utils/network.utils';
import { TrashService } from '../../src/services/drive/trash.service';
import { UserSettingsFixture } from '../fixtures/auth.fixture';
import { WebdavConfig } from '../../src/types/command.types';

describe('WebDav server', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it('When the WebDav server is started with https, it should generate self-signed certificates', async () => {
    const webdavConfig: WebdavConfig = {
      port: randomInt(65535).toString(),
      protocol: 'https',
    };
    const sslSelfSigned = {
      private: randomBytes(8).toString('hex'),
      public: randomBytes(8).toString('hex'),
      cert: randomBytes(8).toString('hex'),
      fingerprint: randomBytes(8).toString('hex'),
    };

    sandbox.stub(ConfigService.instance, 'readWebdavConfig').resolves(webdavConfig);
    sandbox.stub(ConfigService.instance, 'readUser').resolves({
      token: 'TOKEN',
      newToken: 'NEW_TOKEN',
      mnemonic: 'MNEMONIC',
      root_folder_uuid: 'ROOT_FOLDER_UUID',
      user: UserSettingsFixture,
    });
    // @ts-expect-error - We stub the method partially
    const createHTTPSServerStub = sandbox.stub(https, 'createServer').returns({
      listen: sandbox.stub().resolves(),
    });
    // @ts-expect-error - We stub the method partially
    const createHTTPServerStub = sandbox.stub(http, 'createServer').returns({
      listen: sandbox.stub().rejects(),
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
      TrashService.instance,
    );
    await server.start();

    expect(createHTTPSServerStub).to.be.calledOnceWith({ cert: sslSelfSigned.cert, key: sslSelfSigned.private });
    expect(createHTTPServerStub.called).to.be.false;
  });

  it('When the WebDav server is started with http, it should run http', async () => {
    const webdavConfig: WebdavConfig = {
      port: randomInt(65535).toString(),
      protocol: 'http',
    };

    sandbox.stub(ConfigService.instance, 'readWebdavConfig').resolves(webdavConfig);
    sandbox.stub(ConfigService.instance, 'readUser').resolves({
      token: 'TOKEN',
      newToken: 'NEW_TOKEN',
      mnemonic: 'MNEMONIC',
      root_folder_uuid: 'ROOT_FOLDER_UUID',
      user: UserSettingsFixture,
    });
    // @ts-expect-error - We stub the method partially
    const createHTTPServerStub = sandbox.stub(http, 'createServer').returns({
      listen: sandbox.stub().resolves(),
    });
    // @ts-expect-error - We stub the method partially
    const createHTTPSServerStub = sandbox.stub(https, 'createServer').returns({
      listen: sandbox.stub().rejects(),
    });

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
      TrashService.instance,
    );
    await server.start();

    expect(createHTTPServerStub.calledOnce).to.be.true;
    expect(createHTTPSServerStub.called).to.be.false;
  });
});
