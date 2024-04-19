import { expect } from 'chai';
import pm2 from 'pm2';
import sinon from 'sinon';
import { PM2Utils } from '../../src/utils/pm2.utils';
describe('PM2 utils', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  it('When connecting, should connect to PM2 daemon', async () => {
    // @ts-expect-error - The error callback does not include an error
    const connectStub = sandbox.stub(pm2, 'connect').callsFake((callback) => callback());

    await PM2Utils.connect();
    expect(connectStub.calledOnce).to.be.true;
  });

  it('When connecting, and daemon is not available, should reject', async () => {
    const error = new Error('Failed to connect');
    sandbox.stub(pm2, 'connect').callsFake((callback) => {
      // @ts-expect-error - The error callback does not include an error

      callback(error);
    });
    try {
      await PM2Utils.connect();
      expect.fail('Should have thrown an error');
    } catch (err) {
      expect((err as Error).message).to.equal(error.message);
    }
  });

  it('When killing the WebDav server, should delete the process', async () => {
    // @ts-expect-error - The error callback does not include an error
    const deleteStub = sandbox.stub(pm2, 'delete').callsFake((_, callback) => callback());
    await PM2Utils.killWebDavServer();
    expect(deleteStub.calledOnce).to.be.true;
  });

  it('When getting server process status, should return online status when WebDav server is running', async () => {
    sandbox.stub(pm2, 'describe').callsFake((_, callback) => {
      // @ts-expect-error - The error callback does not include an error
      callback(null, [{ pm2_env: { status: 'online' } }]);
    });
    const status = await PM2Utils.webdavServerStatus();
    expect(status.status).to.equal('online');
  });

  it('When getting server process status, should return unknown status when WebDav server is not running', async () => {
    sandbox.stub(pm2, 'describe').callsFake((_, callback) => {
      // @ts-expect-error - The error callback does not include an error
      callback(null, []);
    });

    try {
      await PM2Utils.webdavServerStatus();
      expect.fail('Should have thrown an error');
    } catch (error) {
      expect((error as Error).message).to.equal('WebDav server is not running');
    }
  });

  it('When starting the WebDav server process, should start the WebDav server', async () => {
    // @ts-expect-error - The error callback does not include an error
    const startStub = sandbox.stub(pm2, 'start').callsFake((_, callback) => callback());
    await PM2Utils.startWebDavServer();
    expect(startStub.calledOnce).to.be.true;
  });

  it('When starting the WebDav server process, should reject when failing to start the WebDav server', async () => {
    const error = new Error('Failed to start server');
    // @ts-expect-error - The error callback does not include an error
    sandbox.stub(pm2, 'start').callsFake((_, callback) => callback(error));
    try {
      await PM2Utils.startWebDavServer();
    } catch (error) {
      expect((error as Error).message).to.equal('Failed to start server');
    }
  });
});
