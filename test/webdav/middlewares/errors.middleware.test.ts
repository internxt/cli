import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorHandlingMiddleware } from '../../../src/webdav/middewares/errors.middleware';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';
import { BadRequestError, NotFoundError, NotImplementedError } from '../../../src/utils/errors.utils';
import { XMLUtils } from '../../../src/utils/xml.utils';

describe('Error handling middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When a not found error is received, should respond with a 404', () => {
    const errorMessage = 'Item not found';
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
    expect(res.send).toHaveBeenCalledWith(
      XMLUtils.toWebDavXML(
        {
          [XMLUtils.addDefaultNamespace('responsedescription')]: errorMessage,
        },
        {},
        'error',
      ),
    );
  });

  it('When a bad request error is received, should respond with a 400', () => {
    const errorMessage = 'Missing property "size"';
    const error = new BadRequestError(errorMessage);
    const res = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });
    const req = createWebDavRequestFixture({
      method: 'GET',
      url: '/test',
    });

    ErrorHandlingMiddleware(error, req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      XMLUtils.toWebDavXML(
        {
          [XMLUtils.addDefaultNamespace('responsedescription')]: errorMessage,
        },
        {},
        'error',
      ),
    );
  });

  it('When a not implement error is received, should respond with a 501', () => {
    const errorMessage = 'Content-range is not supported';
    const error = new NotImplementedError(errorMessage);
    const res = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });
    const req = createWebDavRequestFixture({
      method: 'GET',
      url: '/test',
    });

    ErrorHandlingMiddleware(error, req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(501);
    expect(res.send).toHaveBeenCalledWith(
      XMLUtils.toWebDavXML(
        {
          [XMLUtils.addDefaultNamespace('responsedescription')]: errorMessage,
        },
        {},
        'error',
      ),
    );
  });

  it('When something that does not have status code arrives, should return a 500 status code', () => {
    const errorMessage = 'Cannot read property "id" of undefined';
    const error = new TypeError(errorMessage);
    const res = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });
    const req = createWebDavRequestFixture({
      method: 'GET',
      url: '/test',
    });

    ErrorHandlingMiddleware(error, req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.send).toHaveBeenCalledWith(
      XMLUtils.toWebDavXML(
        {
          [XMLUtils.addDefaultNamespace('responsedescription')]: errorMessage,
        },
        {},
        'error',
      ),
    );
  });
});
