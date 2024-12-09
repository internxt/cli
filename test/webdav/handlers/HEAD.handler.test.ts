import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HEADRequestHandler } from '../../../src/webdav/handlers/HEAD.handler';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';

describe('HEAD request handler', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When a WebDav client sends a HEAD request, it should reply with a 405', async () => {
    const requestHandler = new HEADRequestHandler();

    const request = createWebDavRequestFixture({
      method: 'HEAD',
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    await requestHandler.handle(request, response);
    expect(response.status).toHaveBeenCalledWith(405);
  });
});
