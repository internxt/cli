import { expect } from 'chai';
import express from 'express';
import sinon from 'sinon';
import { ConfigService } from '../../src/services/config.service';
import { DriveFolderService } from '../../src/services/drive/drive-folder.service';
import { WebDavServer } from '../../src/webdav/webdav-server';
import { getDriveRealmManager } from '../fixtures/drive-realm.fixture';
import { UploadService } from '../../src/services/network/upload.service';
import { DriveFileService } from '../../src/services/drive/drive-file.service';
import { DownloadService } from '../../src/services/network/download.service';
import { AuthService } from '../../src/services/auth.service';
import { CryptoService } from '../../src/services/crypto.service';
describe('WebDav server', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it('When the WebDav server is started, should listen on the specified port', () => {
    const app = express();
    const server = new WebDavServer(
      app,
      ConfigService.instance,
      DriveFileService.instance,
      DriveFolderService.instance,
      getDriveRealmManager(),
      UploadService.instance,
      DownloadService.instance,
      AuthService.instance,
      CryptoService.instance,
    );

    // @ts-expect-error - We are faking partially the listen method
    const listenStub = sandbox.stub(app, 'listen').callsFake((callback) => {
      callback();
    });

    server.start();

    expect(listenStub.calledOnce).to.be.true;
  });
});
