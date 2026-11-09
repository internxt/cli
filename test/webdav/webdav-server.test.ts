import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import express from 'express';
import { randomBytes } from 'node:crypto';
import http from 'http';
import https from 'https';
import { ConfigService } from '../../src/services/config.service';
import { WebDavServer } from '../../src/webdav/webdav-server';
import {
  ClientCompatibilityService,
  UPDATE_RECOMMENDED_WARNING_INTERVAL_MS,
} from '../../src/services/client-compatibility.service';
import { BLOCK_RECHECK_MS, ClientVersionGate } from '../../src/webdav/middewares/client-version.middleware';
import { ClientVersionUnsupportedError } from '../../src/utils/errors.utils';
import { webdavLogger } from '../../src/utils/logger.utils';
import { NetworkUtils } from '../../src/utils/network.utils';
import { WebdavConfig } from '../../src/types/command.types';
import { UserCredentialsFixture } from '../fixtures/login.fixture';
import { getWebdavConfigMock } from '../fixtures/webdav.fixture';

describe('WebDav server', () => {
  let evaluate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    ClientVersionGate.reset();
    evaluate = vi.spyOn(ClientCompatibilityService.instance, 'evaluate').mockResolvedValue({});
  });

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

  describe('compatibility check', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    test('when the version is unsupported, then requests are refused before reaching the API', async () => {
      evaluate.mockResolvedValue({ blockError: new ClientVersionUnsupportedError('No longer supported.') });

      await new WebDavServer(express()).checkCompatibility();

      expect(ClientVersionGate.getBlockedError()?.message).toContain('No longer supported.');
    });

    test('when there is a warning, then it is logged once and requests continue', async () => {
      evaluate.mockResolvedValue({ warning: 'Deprecated.' });
      const server = new WebDavServer(express());

      await server.checkCompatibility();
      await server.checkCompatibility();

      expect(ClientVersionGate.getBlockedError()).toBeUndefined();
      expect(webdavLogger.warn).toHaveBeenCalledOnce();
      expect(webdavLogger.warn).toHaveBeenCalledWith('[CLIENT VERSION] Deprecated.');
    });

    test('when the same warning persists, then it is logged again every hour', async () => {
      vi.useFakeTimers();
      evaluate.mockResolvedValue({ warning: 'Update available.' });
      const server = new WebDavServer(express());

      await server.checkCompatibility();
      vi.advanceTimersByTime(UPDATE_RECOMMENDED_WARNING_INTERVAL_MS - 1);
      await server.checkCompatibility();
      expect(webdavLogger.warn).toHaveBeenCalledOnce();

      vi.advanceTimersByTime(1);
      await server.checkCompatibility();
      expect(webdavLogger.warn).toHaveBeenCalledTimes(2);
    });

    test('when the check runs, then it does not use up the CLI hourly reminder', async () => {
      await new WebDavServer(express()).checkCompatibility();

      expect(evaluate).toHaveBeenCalledWith({ throttleRecommended: false });
    });

    test('when the server starts, then the check runs and repeats every 5 minutes', async () => {
      vi.useFakeTimers();
      vi.spyOn(ConfigService.instance, 'readWebdavConfig').mockResolvedValue(getWebdavConfigMock({ protocol: 'http' }));
      vi.spyOn(http, 'createServer').mockReturnValue({
        listen: vi.fn(),
      } as unknown as http.Server);

      await new WebDavServer(express()).start();
      expect(evaluate).toHaveBeenCalledTimes(1);

      await vi.advanceTimersByTimeAsync(BLOCK_RECHECK_MS);
      expect(evaluate).toHaveBeenCalledTimes(2);
      vi.clearAllTimers();
    });
  });
});
