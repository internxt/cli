import { beforeEach, describe, expect, it, vi } from 'vitest';
import pm2 from 'pm2';
import { PM2Utils } from '../../src/utils/pm2.utils';
import { fail } from 'node:assert';

describe('PM2 utils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When connecting, should connect to PM2 daemon', async () => {
    // @ts-expect-error - The error callback does not include an error
    const connectStub = vi.spyOn(pm2, 'connect').mockImplementation((callback) => callback());

    await PM2Utils.connect();
    expect(connectStub).toHaveBeenCalledOnce();
  });

  it('When connecting, and daemon is not available, should reject', async () => {
    const error = new Error('Failed to connect');
    // @ts-expect-error - The error callback does not include an error
    vi.spyOn(pm2, 'connect').mockImplementation((callback) => callback(error));
    try {
      await PM2Utils.connect();
      fail('Should have thrown an error');
    } catch (err) {
      expect((err as Error).message).to.be.equal(error.message);
    }
  });

  it('When killing the WebDav server, should delete the process', async () => {
    // @ts-expect-error - The error callback does not include an error
    const deleteStub = vi.spyOn(pm2, 'delete').mockImplementation((_, callback) => callback());
    await PM2Utils.killWebDavServer();
    expect(deleteStub).toHaveBeenCalledOnce();
  });

  it('When getting server process status, should return online status when WebDav server is running', async () => {
    // @ts-expect-error - The error callback does not include an error
    vi.spyOn(pm2, 'describe').mockImplementation((_, callback) => callback(null, [{ pm2_env: { status: 'online' } }]));
    const status = await PM2Utils.webdavServerStatus();
    expect(status.status).to.be.equal('online');
  });

  it('When getting server process status, should return offline status when WebDav server is not running', async () => {
    // @ts-expect-error - The error callback does not include an error
    vi.spyOn(pm2, 'describe').mockImplementation((_, callback) => callback(null, []));

    const status = await PM2Utils.webdavServerStatus();
    expect(status.status).to.be.equal('offline');
  });

  it('When starting the WebDav server process, should start the WebDav server', async () => {
    // @ts-expect-error - The error callback does not include an error
    const startStub = vi.spyOn(pm2, 'start').mockImplementation((_, callback) => callback());
    await PM2Utils.startWebDavServer();
    expect(startStub).toHaveBeenCalledOnce();
  });

  it('When starting the WebDav server process, should reject when failing to start the WebDav server', async () => {
    const error = new Error('Failed to start server');
    // @ts-expect-error - The error callback does not include an error
    vi.spyOn(pm2, 'start').mockImplementation((_, callback) => callback(error));
    try {
      await PM2Utils.startWebDavServer();
      fail('Should have thrown an error');
    } catch (err) {
      expect((err as Error).message).to.be.equal(error.message);
    }
  });
});
