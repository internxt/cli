import { describe, expect, test, vi, beforeEach } from 'vitest';
import { AuthMiddleware } from '../../../src/webdav/middewares/auth.middleware';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';
import { UserCredentialsFixture } from '../../fixtures/login.fixture';
import { AuthService } from '../../../src/services/auth.service';
import { CacheService } from '../../../src/services/cache.service';
import { MissingCredentialsError } from '../../../src/types/command.types';
import { XMLUtils } from '../../../src/utils/xml.utils';

describe('Auth middleware', () => {
  beforeEach(() => {
    CacheService.instance.clearCaches();
  });

  test('when the user is not authenticated, then the server returns an unauthorized status', async () => {
    const req = createWebDavRequestFixture({});
    const res = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });
    const next = vi.fn();

    const authServiceStub = vi
      .spyOn(AuthService.instance, 'getAuthDetails')
      .mockRejectedValue(new MissingCredentialsError());

    await AuthMiddleware()(req, res, next);

    expect(authServiceStub).toHaveBeenCalledOnce();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith(
      XMLUtils.toWebDavXML(
        {
          [XMLUtils.addDefaultNamespace('responsedescription')]: new MissingCredentialsError().message,
        },
        {},
        'error',
      ),
    );
  });

  test('when the user is authenticated, then the middleware proceeds and caches the result', async () => {
    const req = createWebDavRequestFixture({});
    const res = createWebDavResponseFixture({});
    const next = vi.fn();
    const authServiceStub = vi.spyOn(AuthService.instance, 'getAuthDetails').mockResolvedValue(UserCredentialsFixture);

    await AuthMiddleware()(req, res, next);

    expect(authServiceStub).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();

    const cached = CacheService.instance.get(CacheService.AUTH_CACHE_KEY);
    expect(cached).toEqual(UserCredentialsFixture);
  });

  test('when authentication details are already cached, then the middleware skips re-fetching', async () => {
    const req = createWebDavRequestFixture({});
    const res = createWebDavResponseFixture({});
    const next = vi.fn();

    CacheService.instance.set(CacheService.AUTH_CACHE_KEY, UserCredentialsFixture);

    const authServiceStub = vi.spyOn(AuthService.instance, 'getAuthDetails');

    await AuthMiddleware()(req, res, next);

    expect(authServiceStub).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });
});
