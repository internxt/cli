import sinon from 'sinon';
import { WebDavServer } from '../../src/webdav/webdav-server';
import express from 'express';
import { ConfigService } from '../../src/services/config.service';
import { DriveFolderService } from '../../src/services/drive/drive-folder.service';
import { expect } from 'chai';
describe('WebDav server', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it('When starting the webdav server, should throw an error if credentials are missing', async () => {
    const config = ConfigService.instance;
    sandbox.stub(config, 'readUser').resolves(undefined);
    const app = express();
    sandbox.stub(app, 'listen');
    const sut = new WebDavServer(app, config, DriveFolderService.instance);

    try {
      await sut.start();
      expect(false).to.be.true;
    } catch (error) {
      expect((error as Error).message).to.be.equal('Missing credentials, cannot init WebDav server');
    }
  });
});
