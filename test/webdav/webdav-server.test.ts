import { describe, expect, it, vi } from 'vitest';
import express from 'express';
import { randomBytes, randomInt } from 'node:crypto';
import http from 'http';
import https from 'https';
import { ConfigService } from '../../src/services/config.service';
import { WebDavServer } from '../../src/webdav/webdav-server';
import { NetworkUtils } from '../../src/utils/network.utils';
import { WebdavConfig } from '../../src/types/command.types';
import { UserCredentialsFixture } from '../fixtures/login.fixture';

describe('WebDav server', () => {
  it('When the WebDav server is started with https, it should generate self-signed certificates', async () => {
    const webdavConfig: WebdavConfig = {
      host: '127.0.0.1',
      port: randomInt(65535).toString(),
      protocol: 'https',
      timeoutMinutes: randomInt(900),
      createFullPath: true,
    };
    const sslSelfSigned = {
      private: randomBytes(8).toString('hex'),
      public: randomBytes(8).toString('hex'),
      cert: randomBytes(8).toString('hex'),
      fingerprint: randomBytes(8).toString('hex'),
    };

    vi.spyOn(ConfigService.instance, 'readWebdavConfig').mockResolvedValue(webdavConfig);
    vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(UserCredentialsFixture);
    // @ts-expect-error - We stub the method partially
    const createHTTPSServerStub = vi.spyOn(https, 'createServer').mockReturnValue({
      listen: vi.fn().mockResolvedValue({}),
    });
    // @ts-expect-error - We stub the method partially
    const createHTTPServerStub = vi.spyOn(http, 'createServer').mockReturnValue({
      listen: vi.fn().mockRejectedValue(new Error()),
    });
    vi.spyOn(NetworkUtils, 'getWebdavSSLCerts').mockResolvedValue({
      cert: sslSelfSigned.cert,
      key: sslSelfSigned.private,
    });

    const app = express();
    const server = new WebDavServer(app);
    await server.start();

    expect(createHTTPSServerStub).toHaveBeenCalledOnce();
    expect(createHTTPSServerStub).toHaveBeenCalledWith({ cert: sslSelfSigned.cert, key: sslSelfSigned.private }, app);
    expect(createHTTPServerStub).not.toHaveBeenCalled();
  });

  it('When the WebDav server is started with http, it should run http', async () => {
    const webdavConfig: WebdavConfig = {
      host: '127.0.0.1',
      port: randomInt(65535).toString(),
      protocol: 'http',
      timeoutMinutes: randomInt(900),
      createFullPath: true,
    };

    vi.spyOn(ConfigService.instance, 'readWebdavConfig').mockResolvedValue(webdavConfig);
    vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(UserCredentialsFixture);
    // @ts-expect-error - We stub the method partially
    const createHTTPServerStub = vi.spyOn(http, 'createServer').mockReturnValue({
      listen: vi.fn().mockResolvedValue({}),
    });
    // @ts-expect-error - We stub the method partially
    const createHTTPSServerStub = vi.spyOn(https, 'createServer').mockReturnValue({
      listen: vi.fn().mockRejectedValue(new Error()),
    });

    const app = express();
    const server = new WebDavServer(app);
    await server.start();

    expect(createHTTPServerStub).toHaveBeenCalledOnce();
    expect(createHTTPServerStub).toHaveBeenCalledWith(app);
    expect(createHTTPSServerStub).not.toHaveBeenCalled();
  });
});
