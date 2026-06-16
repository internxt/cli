import { describe, expect, test, vi } from 'vitest';
import express from 'express';
import { randomBytes } from 'node:crypto';
import http from 'http';
import https from 'https';
import { ConfigService } from '../../src/services/config.service';
import { WebDavServer } from '../../src/webdav/webdav-server';
import { NetworkUtils } from '../../src/utils/network.utils';
import { WebdavConfig } from '../../src/types/command.types';
import { UserCredentialsFixture } from '../fixtures/login.fixture';
import { getWebdavConfigMock } from '../fixtures/webdav.fixture';

describe('WebDav server', () => {
  test('when the server is started over a secure connection, then it generates security certificates', async () => {
    const webdavConfig: WebdavConfig = getWebdavConfigMock({ protocol: 'https' });
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

  test('when the server is started over a standard connection, then it uses a regular HTTP server', async () => {
    const webdavConfig: WebdavConfig = getWebdavConfigMock({ protocol: 'http' });

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
