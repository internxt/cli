import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthMiddleware } from '../../../src/webdav/middewares/auth.middleware';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';
import { ConfigService } from '../../../src/services/config.service';
import { UserCredentialsFixture } from '../../fixtures/login.fixture';

describe('Auth middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When a request is made to the WebDav server, and the user is not authenticated, should return 401', async () => {
    const req = createWebDavRequestFixture({
      user: null,
    });
    const res = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });
    const next = vi.fn();

    const configServiceStub = vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(undefined);

    await AuthMiddleware(ConfigService.instance)(req, res, next);

    expect(configServiceStub).toHaveBeenCalledOnce();
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.send).toHaveBeenCalledWith({ error: 'Unauthorized' });
  });

  it('When a request is made to the WebDav server, and the user is authenticated, should add the user to the request', async () => {
    const req = createWebDavRequestFixture({
      user: null,
    });
    const res = createWebDavResponseFixture({});
    const next = vi.fn();
    const configServiceStub = vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(UserCredentialsFixture);

    await AuthMiddleware(ConfigService.instance)(req, res, next);

    // @ts-expect-error - User is added to the request, but TS is not picking it as we specified null before
    expect(req.user.rootFolderId).to.be.equal(UserCredentialsFixture.user.root_folder_id);
    expect(configServiceStub).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });
});
