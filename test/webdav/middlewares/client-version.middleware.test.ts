import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import {
  BLOCK_RECHECK_MS,
  ClientVersionGate,
  ClientVersionMiddleware,
} from '../../../src/webdav/middewares/client-version.middleware';
import { ErrorHandlingMiddleware } from '../../../src/webdav/middewares/errors.middleware';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';
import { newApiError, newClientVersionUnsupportedError } from '../../fixtures/errors.fixture';
import { ClientVersionUnsupportedError } from '../../../src/utils/errors.utils';
import { webdavLogger } from '../../../src/utils/logger.utils';
import { XMLUtils } from '../../../src/utils/xml.utils';

describe('Client version middleware', () => {
  beforeEach(() => {
    ClientVersionGate.reset();
  });

  test('when the CLI version has not been blocked, then the request continues', () => {
    const next = vi.fn();

    ClientVersionMiddleware(createWebDavRequestFixture({}), createWebDavResponseFixture({}), next);

    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(undefined);
  });

  test('when the API has blocked the CLI version, then later requests are refused without reaching the API', () => {
    ClientVersionGate.block(newClientVersionUnsupportedError());
    const next = vi.fn();

    ClientVersionMiddleware(createWebDavRequestFixture({}), createWebDavResponseFixture({}), next);

    expect(next).toHaveBeenCalledWith(expect.any(ClientVersionUnsupportedError));
  });

  test('when the version is blocked several times, then the clear error is logged only once', () => {
    ClientVersionGate.block(newClientVersionUnsupportedError());
    ClientVersionGate.block(newClientVersionUnsupportedError());

    expect(webdavLogger.error).toHaveBeenCalledOnce();
    expect(webdavLogger.error).toHaveBeenCalledWith(expect.stringContaining('[CLIENT VERSION]'));
  });

  describe('re-check after a block', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    test('when less than 5 minutes have passed, then requests are still refused', () => {
      vi.useFakeTimers();
      ClientVersionGate.block(newClientVersionUnsupportedError());

      vi.advanceTimersByTime(BLOCK_RECHECK_MS - 1);

      expect(ClientVersionGate.getBlockedError()).toBeInstanceOf(ClientVersionUnsupportedError);
    });

    test('when 5 minutes have passed, then the next request reaches the API again', () => {
      vi.useFakeTimers();
      ClientVersionGate.block(newClientVersionUnsupportedError());

      vi.advanceTimersByTime(BLOCK_RECHECK_MS);
      const next = vi.fn();
      ClientVersionMiddleware(createWebDavRequestFixture({}), createWebDavResponseFixture({}), next);

      expect(next).toHaveBeenCalledWith(undefined);
    });

    test('when the block is confirmed again before it expires, then it lasts another 5 minutes', () => {
      vi.useFakeTimers();
      ClientVersionGate.block(newClientVersionUnsupportedError());
      vi.advanceTimersByTime(BLOCK_RECHECK_MS - 1);

      ClientVersionGate.block(newClientVersionUnsupportedError());
      vi.advanceTimersByTime(BLOCK_RECHECK_MS - 1);

      expect(ClientVersionGate.getBlockedError()).toBeInstanceOf(ClientVersionUnsupportedError);
      expect(webdavLogger.error).toHaveBeenCalledOnce();
    });

    test('when the API still blocks after the re-check, then the block is set and logged again', () => {
      vi.useFakeTimers();
      ClientVersionGate.block(newClientVersionUnsupportedError());
      vi.advanceTimersByTime(BLOCK_RECHECK_MS);

      ClientVersionGate.block(newClientVersionUnsupportedError());

      expect(ClientVersionGate.getBlockedError()).toBeInstanceOf(ClientVersionUnsupportedError);
      expect(webdavLogger.error).toHaveBeenCalledTimes(2);
    });
  });

  describe('restart hint', () => {
    afterEach(() => {
      vi.unstubAllEnvs();
    });

    test('when installed with npm, then the log says to restart the WebDAV server after updating', () => {
      vi.stubEnv('INXT_RUNTIME', '');
      ClientVersionGate.block(newClientVersionUnsupportedError());

      expect(webdavLogger.error).toHaveBeenCalledWith(expect.stringContaining('internxt webdav restart'));
      expect(webdavLogger.error).toHaveBeenCalledWith(expect.stringContaining('@latest. After updating'));
    });

    test('when running in Docker, then the log does not mention restarting the server', () => {
      vi.stubEnv('INXT_RUNTIME', 'docker');
      ClientVersionGate.block(newClientVersionUnsupportedError());

      expect(webdavLogger.error).toHaveBeenCalledWith(expect.not.stringContaining('internxt webdav restart'));
      expect(webdavLogger.error).toHaveBeenCalledWith(expect.stringContaining('webdav:latest. Requests are refused'));
    });
  });

  describe('with the error handling middleware', () => {
    test('when the API blocks the CLI version, then the client gets 403 with the update message and the gate closes', () => {
      const res = createWebDavResponseFixture({
        status: vi.fn().mockReturnValue({ send: vi.fn() }),
      });
      const req = createWebDavRequestFixture({ method: 'PROPFIND', url: '/folder/' });

      ErrorHandlingMiddleware(newClientVersionUnsupportedError(), req, res, () => {});

      const blockedError = ClientVersionGate.getBlockedError();
      expect(blockedError).toBeInstanceOf(ClientVersionUnsupportedError);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith(
        XMLUtils.toWebDavXML(
          { [XMLUtils.addDefaultNamespace('responsedescription')]: blockedError?.message },
          {},
          'error',
        ),
      );
    });

    test('when the API answers a regular 403, then the gate stays open and the client gets 502 as before', () => {
      const res = createWebDavResponseFixture({
        status: vi.fn().mockReturnValue({ send: vi.fn() }),
      });
      const req = createWebDavRequestFixture({ method: 'PROPFIND', url: '/folder/' });

      ErrorHandlingMiddleware(newApiError(403, { data: {} }), req, res, () => {});

      expect(ClientVersionGate.getBlockedError()).toBeUndefined();
      expect(res.status).toHaveBeenCalledWith(502);
    });
  });
});
