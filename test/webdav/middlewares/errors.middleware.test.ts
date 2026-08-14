import { describe, expect, test, vi } from 'vitest';
import { ErrorHandlingMiddleware } from '../../../src/webdav/middewares/errors.middleware';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';
import { BadRequestError, NotFoundError, NotImplementedError } from '../../../src/utils/errors.utils';
import { XMLUtils } from '../../../src/utils/xml.utils';
import { AxiosResponseError, AxiosUnknownError } from '@internxt/sdk/dist/shared/types/errors';
import { AxiosError } from 'axios';

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

  test('when a Drive API request fails with a response, then the server forwards its status and detail', () => {
    const error = new AxiosResponseError('Request failed with status code 400', 'POST /files', {
      status: 400,
      data: { message: 'fileId must not be provided when size is 0', statusCode: 400 },
      headers: {},
      statusText: 'Bad Request',
      // @ts-expect-error partial AxiosResponse fixture, only the fields read by AxiosResponseError are needed
      config: {},
    });
    const res = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });
    const req = createWebDavRequestFixture({
      method: 'PUT',
      url: '/test/empty.bin',
    });

    ErrorHandlingMiddleware(error, req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      XMLUtils.toWebDavXML(
        {
          [XMLUtils.addDefaultNamespace('responsedescription')]:
            'Request failed with status code 400 [fileId must not be provided when size is 0]',
        },
        {},
        'error',
      ),
    );
  });

  test('when a Drive API request fails without a response, then the server responds with the normalized status and no detail suffix', () => {
    const axiosError = {
      message: 'Network Error',
      code: 'ECONNABORTED',
      // no `request` -> AxiosUnknownError normalizes this to status 400
      request: undefined,
      config: {},
    } as AxiosError;
    const error = new AxiosUnknownError('Network Error', 'POST /files', axiosError);
    const res = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });
    const req = createWebDavRequestFixture({
      method: 'PUT',
      url: '/test/empty.bin',
    });

    ErrorHandlingMiddleware(error, req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.send).toHaveBeenCalledWith(
      XMLUtils.toWebDavXML(
        {
          [XMLUtils.addDefaultNamespace('responsedescription')]: 'Network Error',
        },
        {},
        'error',
      ),
    );
  });
});
