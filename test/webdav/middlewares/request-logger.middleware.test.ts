import { describe, expect, test, vi } from 'vitest';
import { webdavLogger } from '../../../src/utils/logger.utils';
import { RequestLoggerMiddleware } from '../../../src/webdav/middewares/request-logger.middleware';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';

describe('Request logger middleware', () => {
  test('when a request is received, then the logger records only the specified methods', () => {
    const req = createWebDavRequestFixture({
      method: 'PROPFIND',
      url: '/path',
    });
    const next = vi.fn();
    const infoStub = vi.spyOn(webdavLogger, 'info');

    const middleware = RequestLoggerMiddleware({ methods: ['PROPFIND'], enable: true });
    middleware(req, createWebDavResponseFixture({}), next);

    expect(infoStub).toHaveBeenCalledOnce();
    expect(infoStub).toHaveBeenCalledWith(expect.stringContaining('[PROPFIND] /path - Start'));
    expect(next).toHaveBeenCalledOnce();
  });

  test('when a request method is not in the specified list, then the logger does not record it', () => {
    const req = createWebDavRequestFixture({
      method: 'GET',
      url: '/path',
    });
    const next = vi.fn();
    const infoStub = vi.spyOn(webdavLogger, 'info');

    const middleware = RequestLoggerMiddleware({ methods: ['PROPFIND'], enable: true });
    middleware(req, createWebDavResponseFixture({}), next);

    expect(infoStub).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });
});
