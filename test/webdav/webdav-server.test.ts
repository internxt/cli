import { expect } from 'chai';
import express from 'express';
import sinon from 'sinon';
import { ConfigService } from '../../src/services/config.service';
import { DriveFolderService } from '../../src/services/drive/drive-folder.service';
import { WebDavServer } from '../../src/webdav/webdav-server';
describe('WebDav server', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it('When the WebDav server is started, should listen on the specified port', () => {
    const app = express();
    const server = new WebDavServer(app, ConfigService.instance, DriveFolderService.instance);

    // @ts-expect-error - We are faking partially the listen method
    const listenStub = sandbox.stub(app, 'listen').callsFake((callback) => {
      callback();
    });

    server.start();

    expect(listenStub.calledOnce).to.be.true;
  });
});
