import { describe, expect, it, vi } from 'vitest';
import { UNLOCKRequestHandler } from '../../../src/webdav/handlers/UNLOCK.handler';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';

describe('UNLOCK request handler', () => {
  it('should return 204 when a valid lock token is provided', async () => {
    const requestHandler = new UNLOCKRequestHandler();

    const request = createWebDavRequestFixture({
      method: 'UNLOCK',
      url: '/file.txt',
      headers: {
        'lock-token': '<opaquelocktoken:550e8400-e29b-41d4-a716-446655440000>',
      },
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    await requestHandler.handle(request, response);

    expect(response.status).toHaveBeenCalledWith(204);
  });

  it('should return 204 even when no lock token header is provided', async () => {
    const requestHandler = new UNLOCKRequestHandler();

    const request = createWebDavRequestFixture({
      method: 'UNLOCK',
      url: '/file.txt',
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    await requestHandler.handle(request, response);

    expect(response.status).toHaveBeenCalledWith(204);
  });
});
