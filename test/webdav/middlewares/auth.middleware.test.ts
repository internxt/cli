import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthMiddleware } from '../../../src/webdav/middewares/auth.middleware';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';
import { UserCredentialsFixture } from '../../fixtures/login.fixture';
import { AuthService } from '../../../src/services/auth.service';
import { MissingCredentialsError } from '../../../src/types/command.types';
import { XMLUtils } from '../../../src/utils/xml.utils';

describe('Auth middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When the user is not authenticated, then it should return 401', async () => {
    const req = createWebDavRequestFixture({
      user: null,
    });
    const res = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });
    const next = vi.fn();

    const authServiceStub = vi
      .spyOn(AuthService.instance, 'getAuthDetails')
      .mockRejectedValue(new MissingCredentialsError());

    await AuthMiddleware(AuthService.instance)(req, res, next);

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

  it('When the user is authenticated, then it should add the user to the request', async () => {
    const req = createWebDavRequestFixture({
      user: null,
    });
    const res = createWebDavResponseFixture({});
    const next = vi.fn();
    const authServiceStub = vi.spyOn(AuthService.instance, 'getAuthDetails').mockResolvedValue(UserCredentialsFixture);

    await AuthMiddleware(AuthService.instance)(req, res, next);

    // @ts-expect-error - User is added to the request, but TS is not picking it as we specified null before
    expect(req.user.rootFolderId).to.be.equal(UserCredentialsFixture.user.root_folder_id);
    expect(authServiceStub).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(res.send).not.toHaveBeenCalled();
  });
});
