import { beforeEach, describe, expect, it, vi } from 'vitest';
import { webdavLogger } from '../../../src/utils/logger.utils';
import { RequestLoggerMiddleware } from '../../../src/webdav/middewares/request-logger.middleware';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';

describe('Request logger middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When a request is received, should log only the specified methods', () => {
    const req = createWebDavRequestFixture({
      method: 'PROPFIND',
      url: '/path',
    });
    const next = vi.fn();
    const infoStub = vi.spyOn(webdavLogger, 'info');

    const middleware = RequestLoggerMiddleware({ methods: ['PROPFIND'], enable: true });
    middleware(req, createWebDavResponseFixture({}), next);

    expect(infoStub).toHaveBeenCalledOnce();
    expect(infoStub).toHaveBeenCalledWith(expect.stringContaining('WebDav request received'));
    expect(next).toHaveBeenCalledOnce();
  });

  it('When a request is received, should not log the request if the method is not specified', () => {
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
