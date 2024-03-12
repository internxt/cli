import { expect } from 'chai';
import express from 'express';
import sinon from 'sinon';
import { randomBytes, randomInt } from 'crypto';
import https, { Server } from 'https';
import selfsigned from 'selfsigned';
import { ConfigService } from '../../src/services/config.service';
import { DriveFolderService } from '../../src/services/drive/drive-folder.service';
import { WebDavServer } from '../../src/webdav/webdav-server';
import { getDriveRealmManager } from '../fixtures/drive-realm.fixture';
import { ConfigKeys } from '../../src/types/config.types';

describe('WebDav server', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it('When the WebDav server is started, should listen on the specified port using https', () => {
    const envEndpoint: { key: keyof ConfigKeys; value: string } = {
      key: 'WEBDAV_SERVER_PORT',
      value: randomInt(65535).toString(),
    };

    sandbox.stub(ConfigService.instance, 'get').withArgs(envEndpoint.key).returns(envEndpoint.value);
    // @ts-expect-error - We stub the method partially
    const createServerStub = sandbox.stub(https, 'createServer').returns({
      listen: sandbox.stub().resolves(),
    });

    const app = express();
    const server = new WebDavServer(app, ConfigService.instance, DriveFolderService.instance, getDriveRealmManager());
    server.start();

    expect(createServerStub.calledOnce).to.be.true;
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
    // @ts-expect-error - We only mock the properties we need
    sandbox.stub(selfsigned, 'generate').returns(sslSelfSigned);

    const app = express();
    const server = new WebDavServer(app, ConfigService.instance, DriveFolderService.instance, getDriveRealmManager());
    server.start();

    expect(createServerStub).to.be.calledOnceWith({ cert: sslSelfSigned.cert, key: sslSelfSigned.private });
  });
});
