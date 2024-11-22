import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OPTIONSRequestHandler } from '../../../src/webdav/handlers/OPTIONS.handler';
import { UserSettingsFixture } from '../../fixtures/auth.fixture';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';

describe('OPTIONS request handler', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When a WebDav client sends an OPTIONS request, it should return the allowed methods', async () => {
    const requestHandler = new OPTIONSRequestHandler();

    const request = createWebDavRequestFixture({
      method: 'OPTIONS',
      user: UserSettingsFixture,
    });
    const response = createWebDavResponseFixture({
      header: vi.fn(),
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    await requestHandler.handle(request, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.header).toHaveBeenCalledWith(
      'Allow',
      'OPTIONS, GET, HEAD, POST, PUT, DELETE, PROPFIND, PROPPATCH, MKCOL, COPY, MOVE, LOCK, UNLOCK',
    );
    expect(response.header).toHaveBeenCalledWith('DAV', '1, 2, ordered-collections');
  });
});
