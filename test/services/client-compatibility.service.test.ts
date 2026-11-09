import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import fs from 'node:fs/promises';
import axios from 'axios';
import {
  ClientCompatibility,
  ClientCompatibilityService,
  COMPATIBILITY_CACHE_TTL_MS,
  COMPATIBILITY_REQUEST_TIMEOUT_MS,
  UPDATE_RECOMMENDED_WARNING_INTERVAL_MS,
} from '../../src/services/client-compatibility.service';
import { ConfigService } from '../../src/services/config.service';
import { CLIENT_COMPATIBILITY_CACHE_FILE } from '../../src/constants/configs';
import { ClientVersionUnsupportedError } from '../../src/utils/errors.utils';
import { newApiError, newNetworkError } from '../fixtures/errors.fixture';
import packageJson from '../../package.json';

const API_URL = 'https://gateway.test/drive';

const deprecated: ClientCompatibility = {
  status: 'deprecated',
  message: 'This version of the app is deprecated. Please update.',
  recommendedVersion: '1.7.0',
  sunsetAt: '2099-01-15T00:00:00.000Z',
};

describe('Client compatibility service', () => {
  let cacheFile: string | undefined;
  const sut = ClientCompatibilityService.instance;

  const writeCacheFile = (cache: object) => {
    cacheFile = JSON.stringify({
      clientVersion: packageJson.version,
      apiUrl: API_URL,
      checkedAt: Date.now(),
      ...cache,
    });
  };
  const readCacheFile = () => JSON.parse(cacheFile ?? 'null');
  const mockResponse = (compatibility: object) => vi.spyOn(axios, 'get').mockResolvedValue({ data: compatibility });

  beforeEach(() => {
    cacheFile = undefined;
    vi.stubEnv('DRIVE_NEW_API_URL', API_URL);
    vi.stubEnv('INXT_SKIP_VERSION_CHECK', '');
    vi.spyOn(ConfigService.instance, 'ensureInternxtCliDataDirExists').mockResolvedValue();
    vi.spyOn(fs, 'readFile').mockImplementation((async (path: string) => {
      if (path !== CLIENT_COMPATIBILITY_CACHE_FILE || cacheFile === undefined) throw new Error('ENOENT');
      return cacheFile;
    }) as typeof fs.readFile);
    vi.spyOn(fs, 'writeFile').mockImplementation((async (_: string, data: string) => {
      cacheFile = data;
    }) as typeof fs.writeFile);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe('status check', () => {
    test('when there is no cache, then the endpoint is called with the client headers and a 2s timeout', async () => {
      const get = mockResponse(deprecated);

      await sut.evaluate();

      expect(get).toHaveBeenCalledWith(
        `${API_URL}/clients/compatibility`,
        expect.objectContaining({
          headers: expect.objectContaining({
            'internxt-client': packageJson.clientName,
            'internxt-version': packageJson.version,
          }),
          timeout: COMPATIBILITY_REQUEST_TIMEOUT_MS,
        }),
      );
      expect(readCacheFile()).toMatchObject({ clientVersion: packageJson.version, compatibility: deprecated });
    });

    test('when the cache is fresh, then the endpoint is not called', async () => {
      writeCacheFile({ compatibility: { status: 'unsupported' } });
      const get = vi.spyOn(axios, 'get');

      const { blockError } = await sut.evaluate();

      expect(blockError).toBeInstanceOf(ClientVersionUnsupportedError);
      expect(get).not.toHaveBeenCalled();
    });

    test('when the cache has expired, then the endpoint is called and the cache refreshed', async () => {
      writeCacheFile({ checkedAt: Date.now() - COMPATIBILITY_CACHE_TTL_MS, compatibility: { status: 'up_to_date' } });
      mockResponse({ status: 'unsupported' });

      expect((await sut.evaluate()).blockError).toBeInstanceOf(ClientVersionUnsupportedError);
      expect(readCacheFile().compatibility.status).toBe('unsupported');
    });

    test('when the cached version is unsupported, then it is never checked again', async () => {
      writeCacheFile({ checkedAt: 0, compatibility: { status: 'unsupported' } });
      const get = vi.spyOn(axios, 'get');

      expect((await sut.evaluate()).blockError).toBeInstanceOf(ClientVersionUnsupportedError);
      expect(get).not.toHaveBeenCalled();
    });

    test.each([
      ['another CLI version', { clientVersion: '0.0.1' }],
      ['another API URL', { apiUrl: 'https://other.test' }],
    ])('when the cache belongs to %s, then it is ignored', async (_, cache) => {
      writeCacheFile({ ...cache, compatibility: { status: 'unsupported' } });
      mockResponse({ status: 'up_to_date' });

      expect(await sut.evaluate()).toEqual({});
    });

    test('when the cache file is corrupted, then the endpoint is called', async () => {
      cacheFile = '{not json';
      const get = mockResponse({ status: 'up_to_date' });

      await sut.evaluate();

      expect(get).toHaveBeenCalledOnce();
    });

    test.each([
      ['offline', newNetworkError()],
      ['404 (backend not deployed)', newApiError(404)],
      ['400 (invalid headers)', newApiError(400)],
      ['timeout', Object.assign(new Error('timeout of 2000ms exceeded'), { code: 'ECONNABORTED' })],
    ])('when the check fails (%s) and there is no cache, then nothing is blocked', async (_, error) => {
      vi.spyOn(axios, 'get').mockRejectedValue(error);

      expect(await sut.evaluate()).toEqual({});
    });

    test('when the check fails, then it is not retried until the cache expires', async () => {
      const get = vi.spyOn(axios, 'get').mockRejectedValue(newNetworkError());

      await sut.evaluate();
      await sut.evaluate();

      expect(get).toHaveBeenCalledOnce();
    });

    test('when the check fails and there is an expired cache, then the cached status is used', async () => {
      writeCacheFile({ checkedAt: 0, compatibility: deprecated });
      vi.spyOn(axios, 'get').mockRejectedValue(newNetworkError());

      expect((await sut.evaluate()).warning).toContain(deprecated.message);
    });

    test('when the response has an unknown status, then it counts as a failed check', async () => {
      mockResponse({ status: 'something_new' });

      expect(await sut.evaluate()).toEqual({});
      expect(readCacheFile().compatibility).toBeUndefined();
    });

    test('when the cache cannot be written, then the verdict is still returned', async () => {
      mockResponse({ status: 'unsupported' });
      vi.spyOn(fs, 'writeFile').mockRejectedValue(new Error('EACCES'));

      expect((await sut.evaluate()).blockError).toBeInstanceOf(ClientVersionUnsupportedError);
    });

    test.each(['1', 'true'])('when INXT_SKIP_VERSION_CHECK=%s, then no check is done', async (value) => {
      vi.stubEnv('INXT_SKIP_VERSION_CHECK', value);
      writeCacheFile({ compatibility: { status: 'unsupported' } });
      const get = vi.spyOn(axios, 'get');

      expect(await sut.evaluate()).toEqual({});
      expect(get).not.toHaveBeenCalled();
    });
  });

  describe('verdict', () => {
    test('when the version is unsupported, then the block error has the backend message and the update command', async () => {
      writeCacheFile({
        compatibility: { status: 'unsupported', message: 'No longer supported.', recommendedVersion: '1.7.0' },
      });

      const { blockError, warning } = await sut.evaluate();

      expect(warning).toBeUndefined();
      expect(blockError?.message).toContain('No longer supported.');
      expect(blockError?.message).toContain('recommended version: 1.7.0');
      expect(blockError?.message).toContain('npm install -g @internxt/cli@latest');
    });

    test('when the version is deprecated, then every check warns with the sunset date and the update command', async () => {
      writeCacheFile({ compatibility: deprecated });

      const first = await sut.evaluate();
      const second = await sut.evaluate();

      expect(first.blockError).toBeUndefined();
      expect(first.warning).toContain(deprecated.message);
      expect(first.warning).toContain('It will stop working on');
      expect(first.warning).toContain('npm install -g @internxt/cli@latest');
      expect(second.warning).toBe(first.warning);
    });

    test('when the sunset date is in the past, then the warning still shows it and nothing is blocked', async () => {
      writeCacheFile({ compatibility: { ...deprecated, sunsetAt: '2020-01-01T00:00:00Z' } });

      const { blockError, warning } = await sut.evaluate();

      expect(blockError).toBeUndefined();
      expect(warning).toContain('It was scheduled to stop working on');
    });

    test('when the sunset date is shown in a timezone behind UTC, then it keeps the UTC calendar day', async () => {
      vi.stubEnv('TZ', 'America/Los_Angeles');
      writeCacheFile({ compatibility: { ...deprecated, sunsetAt: '2099-03-01T00:00:00.000Z' } });

      expect((await sut.evaluate()).warning).toContain('1 March, 2099');
    });

    test('when running in Docker, then the warning says to pull the image', async () => {
      vi.stubEnv('INXT_RUNTIME', 'docker');
      writeCacheFile({ compatibility: deprecated });

      expect((await sut.evaluate()).warning).toContain('docker pull internxt/webdav:latest');
    });

    test('when an update is recommended, then it warns at most every hour', async () => {
      writeCacheFile({ compatibility: { status: 'update_recommended' } });

      expect((await sut.evaluate()).warning).toContain('A newer version of the Internxt CLI is available.');
      expect((await sut.evaluate()).warning).toBeUndefined();

      writeCacheFile({
        compatibility: { status: 'update_recommended' },
        recommendedWarnedAt: Date.now() - UPDATE_RECOMMENDED_WARNING_INTERVAL_MS,
      });
      expect((await sut.evaluate()).warning).toBeDefined();
    });

    test('when the cache is refreshed, then the last recommendation time is kept', async () => {
      writeCacheFile({
        checkedAt: 0,
        compatibility: { status: 'update_recommended' },
        recommendedWarnedAt: Date.now(),
      });
      mockResponse({ status: 'update_recommended' });

      expect((await sut.evaluate()).warning).toBeUndefined();
    });

    test('when the version is up to date, then there is no block and no warning', async () => {
      writeCacheFile({ compatibility: { status: 'up_to_date' } });

      expect(await sut.evaluate()).toEqual({});
    });
  });
});
