import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorHandlingMiddleware } from '../../../src/webdav/middewares/errors.middleware';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';
import { BadRequestError, NotFoundError, NotImplementedError } from '../../../src/utils/errors.utils';

describe('Error handling middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When a not found error is received, should respond with a 404', () => {
    const error = new NotFoundError('Item not found');
    const res = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });
    const req = createWebDavRequestFixture({
      method: 'GET',
      url: '/test',
    });

    ErrorHandlingMiddleware(error, req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.send).toHaveBeenCalledWith({ error: { message: 'Item not found' } });
  });

  it('When a bad request error is received, should respond with a 400', () => {
    const error = new BadRequestError('Missing property "size"');
    const res = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });
    const req = createWebDavRequestFixture({
      method: 'GET',
      url: '/test',
    });

    ErrorHandlingMiddleware(error, req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith({ error: { message: 'Missing property "size"' } });
  });

  it('When a not implement error is received, should respond with a 501', () => {
    const error = new NotImplementedError('Content-range is not supported');
    const res = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });
    const req = createWebDavRequestFixture({
      method: 'GET',
      url: '/test',
    });

    ErrorHandlingMiddleware(error, req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(501);
    expect(res.send).toHaveBeenCalledWith({ error: { message: 'Content-range is not supported' } });
  });

  it('When something that does not have status code arrives, should return a 500 status code', () => {
    const error = new TypeError('Cannot read property "id" of undefined');
    const res = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });
    const req = createWebDavRequestFixture({
      method: 'GET',
      url: '/test',
    });

    ErrorHandlingMiddleware(error, req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith({ error: { message: 'Cannot read property "id" of undefined' } });
  });
});
