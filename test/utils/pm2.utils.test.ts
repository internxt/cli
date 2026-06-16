import { describe, expect, test, vi } from 'vitest';
import pm2 from 'pm2';
import { PM2Utils } from '../../src/utils/pm2.utils';
import { fail } from 'node:assert';

describe('PM2 utils', () => {
  test('when connecting to the process manager, then the connection is established', async () => {
    // @ts-expect-error - The error callback does not include an error
    const connectStub = vi.spyOn(pm2, 'connect').mockImplementation((callback) => callback());

    await PM2Utils.connect();
    expect(connectStub).toHaveBeenCalledOnce();
  });

  test('when connecting and the process manager is not available, then the connection is rejected', async () => {
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

  test('when stopping the WebDAV server, then the server process is deleted', async () => {
    // @ts-expect-error - The error callback does not include an error
    const deleteStub = vi.spyOn(pm2, 'delete').mockImplementation((_, callback) => callback());
    await PM2Utils.killWebDavServer();
    expect(deleteStub).toHaveBeenCalledOnce();
  });

  test('when the WebDAV server is running, then the status is reported as online', async () => {
    // @ts-expect-error - The error callback does not include an error
    vi.spyOn(pm2, 'describe').mockImplementation((_, callback) => callback(null, [{ pm2_env: { status: 'online' } }]));
    const status = await PM2Utils.webdavServerStatus();
    expect(status.status).to.be.equal('online');
  });

  test('when the WebDAV server is not running, then the status is reported as offline', async () => {
    // @ts-expect-error - The error callback does not include an error
    vi.spyOn(pm2, 'describe').mockImplementation((_, callback) => callback(null, []));

    const status = await PM2Utils.webdavServerStatus();
    expect(status.status).to.be.equal('offline');
  });

  test('when starting the WebDAV server, then the server process is started', async () => {
    // @ts-expect-error - The error callback does not include an error
    const startStub = vi.spyOn(pm2, 'start').mockImplementation((_, callback) => callback());
    await PM2Utils.startWebDavServer();
    expect(startStub).toHaveBeenCalledOnce();
  });

  test('when starting the WebDAV server fails, then an error is returned', async () => {
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
