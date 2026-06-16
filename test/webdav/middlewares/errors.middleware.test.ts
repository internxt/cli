import { describe, expect, test, vi } from 'vitest';
import { ErrorHandlingMiddleware } from '../../../src/webdav/middewares/errors.middleware';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';
import { BadRequestError, NotFoundError, NotImplementedError } from '../../../src/utils/errors.utils';
import { XMLUtils } from '../../../src/utils/xml.utils';

describe('Error handling middleware', () => {
  test('when a not found error occurs, then the server responds with a 404 status', () => {
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

  test('when a bad request error occurs, then the server responds with a 400 status', () => {
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

  test('when a not implemented error occurs, then the server responds with a 501 status', () => {
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

  test('when an unknown error occurs, then the server responds with a 500 status', () => {
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
