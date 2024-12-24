import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OPTIONSRequestHandler } from '../../../src/webdav/handlers/OPTIONS.handler';
import { UserSettingsFixture } from '../../fixtures/auth.fixture';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';

describe('OPTIONS request handler', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When the root folder is requested, it should return all of the server allowed methods', async () => {
    const requestHandler = new OPTIONSRequestHandler();

    const request = createWebDavRequestFixture({
      method: 'OPTIONS',
      user: UserSettingsFixture,
      url: '/',
    });
    const response = createWebDavResponseFixture({
      header: vi.fn(),
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    await requestHandler.handle(request, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.header).toHaveBeenCalledWith('Allow', 'DELETE, GET, HEAD, MKCOL, MOVE, OPTIONS, PROPFIND, PUT');
    expect(response.header).toHaveBeenCalledWith('DAV', '1, 2, ordered-collections');
  });

  it('When a folder is requested, it should return all of the folder allowed methods', async () => {
    const requestHandler = new OPTIONSRequestHandler();

    const request = createWebDavRequestFixture({
      method: 'OPTIONS',
      user: UserSettingsFixture,
      url: '/folder/',
    });
    const response = createWebDavResponseFixture({
      header: vi.fn(),
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    await requestHandler.handle(request, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.header).toHaveBeenCalledWith('Allow', 'DELETE, HEAD, MKCOL, MOVE, OPTIONS, PROPFIND');
    expect(response.header).toHaveBeenCalledWith('DAV', '1, 2, ordered-collections');
  });

  it('When a file is requested, it should return all of the file allowed methods', async () => {
    const requestHandler = new OPTIONSRequestHandler();

    const request = createWebDavRequestFixture({
      method: 'OPTIONS',
      user: UserSettingsFixture,
      url: '/file',
    });
    const response = createWebDavResponseFixture({
      header: vi.fn(),
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    await requestHandler.handle(request, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.header).toHaveBeenCalledWith('Allow', 'DELETE, GET, HEAD, MOVE, OPTIONS, PROPFIND, PUT');
    expect(response.header).toHaveBeenCalledWith('DAV', '1, 2, ordered-collections');
  });
});
