import { describe, expect, test } from 'vitest';
import { ErrorUtils, NotFoundError, NotImplementedError, ServiceUnavailableError } from '../../src/utils/errors.utils';
import { newApiError, newNetworkError } from '../fixtures/errors.fixture';
import { logger } from '../../src/utils/logger.utils';

describe('Errors Utils', () => {
  test('when an error is reported, then it is logged with its details', () => {
    const error = new Error('Test Error');
    const props = { key: 'value' };

    ErrorUtils.report(error, props);

    expect(logger.error).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledWith(
      `[REPORTED_ERROR]: ${error.message}\nProperties => ${JSON.stringify(props, null, 2)}\nStack => ${error.stack}`,
    );
  });

  test('when an object is reported, then it is logged with its details', () => {
    const error = { data: 'error data' };
    const props = { key: 'value' };

    ErrorUtils.report(error, props);

    expect(logger.error).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledWith(
      `[REPORTED_ERROR]: ${JSON.stringify(error)}\nProperties => ${JSON.stringify(props, null, 2)}\n`,
    );
  });
  describe('isAlreadyExistsError', () => {
    test('when an error has an already-exists message, then it is detected', () => {
      const error = new Error('File already exists');

      expect(ErrorUtils.isAlreadyExistsError(error)).toBe(true);
    });

    test('when an error has a conflict status, then it is detected', () => {
      const error = { status: 409, message: 'Conflict' };

      expect(ErrorUtils.isAlreadyExistsError(error)).toBe(true);
    });

    test('when the input is not an error object, then it is not detected', () => {
      expect(ErrorUtils.isAlreadyExistsError('string error')).toBe(false);
      expect(ErrorUtils.isAlreadyExistsError(123)).toBe(false);
      expect(ErrorUtils.isAlreadyExistsError(null)).toBe(false);
      expect(ErrorUtils.isAlreadyExistsError(undefined)).toBe(false);
    });
  });

  describe('isFileNotFoundError', () => {
    test('when an error has a file-not-found code, then it is detected', () => {
      const error = new Error('File not found');
      Object.assign(error, { code: 'ENOENT' });

      expect(ErrorUtils.isFileNotFoundError(error)).toBe(true);
    });

    test('when a filesystem file-not-found error occurs, then it is detected', () => {
      const error = Object.assign(new Error('ENOENT: no such file or directory'), {
        code: 'ENOENT',
        errno: -2,
        syscall: 'open',
        path: '/nonexistent/file.txt',
      });

      expect(ErrorUtils.isFileNotFoundError(error)).toBe(true);
    });

    test('when an error has a different code, then it is not detected', () => {
      const error = new Error('Permission denied');
      Object.assign(error, { code: 'EACCES' });

      expect(ErrorUtils.isFileNotFoundError(error)).toBe(false);
    });

    test('when an error has no code, then it is not detected', () => {
      const error = new Error('Some error');

      expect(ErrorUtils.isFileNotFoundError(error)).toBe(false);
    });

    test('when the input is not an error object, then it is not detected', () => {
      expect(ErrorUtils.isFileNotFoundError({ code: 'ENOENT' })).toBe(false);
      expect(ErrorUtils.isFileNotFoundError('ENOENT')).toBe(false);
      expect(ErrorUtils.isFileNotFoundError(null)).toBe(false);
      expect(ErrorUtils.isFileNotFoundError(undefined)).toBe(false);
      expect(ErrorUtils.isFileNotFoundError(123)).toBe(false);
    });
  });

  describe('getRequestId', () => {
    test('when a Drive API error carries the x-request-id header, then its request id is returned', () => {
      const error = newApiError(500, { requestId: 'req-123' });

      expect(ErrorUtils.getRequestId(error)).toBe('req-123');
    });

    test('when a Drive API error only carries the request id in its response body, then it is returned', () => {
      const error = newApiError(500, { data: { requestId: 'req-789' } });

      expect(ErrorUtils.getRequestId(error)).toBe('req-789');
    });

    test('when an error carries a requestId property, then it is returned', () => {
      const error = Object.assign(new Error('Something failed'), { requestId: 'req-456' });

      expect(ErrorUtils.getRequestId(error)).toBe('req-456');
    });

    test('when an error has no request id, then nothing is returned', () => {
      expect(ErrorUtils.getRequestId(new Error('Something failed'))).toBeUndefined();
      expect(ErrorUtils.getRequestId({ xRequestId: '' })).toBeUndefined();
      expect(ErrorUtils.getRequestId('string error')).toBeUndefined();
      expect(ErrorUtils.getRequestId(null)).toBeUndefined();
    });
  });

  describe('withRequestId', () => {
    test('when the error has a request id, then it is appended to the message', () => {
      const error = Object.assign(new Error('Something failed'), { requestId: 'req-123' });

      expect(ErrorUtils.withRequestId('Something failed', error)).toBe('Something failed (requestId: req-123)');
    });

    test('when the error has no request id, then the message is unchanged', () => {
      expect(ErrorUtils.withRequestId('Something failed', new Error('Something failed'))).toBe('Something failed');
    });
  });

  describe('classifyLookupError', () => {
    test('when the API answered 404, then the item is conclusively absent', () => {
      expect(ErrorUtils.classifyLookupError(newApiError(404))).toBe('not-found');
      expect(ErrorUtils.classifyLookupError(new NotFoundError('gone'))).toBe('not-found');
    });

    test.each([400, 414, 422])('when the API rejected the path with %i, then the item reads as absent', (status) => {
      expect(ErrorUtils.classifyLookupError(newApiError(status))).toBe('not-found');
    });

    test.each([401, 403])('when the API rejected the session with %i, then retrying cannot help', (status) => {
      expect(ErrorUtils.classifyLookupError(newApiError(status))).toBe('auth');
    });

    test.each([408, 425, 429, 500, 502, 503, 504])(
      'when the lookup failed upstream with %i, then nothing can be concluded',
      (status) => {
        expect(ErrorUtils.classifyLookupError(newApiError(status))).toBe('inconclusive');
      },
    );

    test('when no response ever arrived, then its invented status is not read as an answer', () => {
      expect(ErrorUtils.getStatusCode(newNetworkError({ sent: false }))).toBe(400);
      expect(ErrorUtils.classifyLookupError(newNetworkError({ sent: false }))).toBe('inconclusive');
      expect(ErrorUtils.classifyLookupError(newNetworkError())).toBe('inconclusive');
    });

    test('when the error carries no status at all, then nothing can be concluded', () => {
      expect(ErrorUtils.classifyLookupError(new Error('boom'))).toBe('inconclusive');
      expect(ErrorUtils.classifyLookupError(undefined)).toBe('inconclusive');
    });
  });

  describe('toWebDavStatus', () => {
    test('when a CLI error is raised, then its status reaches the client untouched', () => {
      expect(ErrorUtils.toWebDavStatus(new NotFoundError('gone'))).toEqual({ statusCode: 404 });
      expect(ErrorUtils.toWebDavStatus(new NotImplementedError('no COPY'))).toEqual({ statusCode: 501 });
      expect(ErrorUtils.toWebDavStatus(new ServiceUnavailableError('busy', 7))).toEqual({
        statusCode: 503,
        retryAfter: 7,
      });
    });

    test.each([408, 425, 429, 500, 502, 503, 504])(
      'when the API answered %i, then the client is told to retry',
      (status) => {
        expect(ErrorUtils.toWebDavStatus(newApiError(status))).toEqual({ statusCode: 503, retryAfter: 5 });
      },
    );

    test.each([401, 403])('when the API rejected the session with %i, then the client gets a 502', (status) => {
      expect(ErrorUtils.toWebDavStatus(newApiError(status))).toEqual({ statusCode: 502 });
    });

    test.each([400, 404, 409, 412])('when the API answered %i, then it is passed through', (status) => {
      expect(ErrorUtils.toWebDavStatus(newApiError(status))).toEqual({ statusCode: status });
    });

    test('when no response ever arrived, then the invented status is not forwarded', () => {
      expect(ErrorUtils.toWebDavStatus(newNetworkError({ sent: false }))).toEqual({ statusCode: 503, retryAfter: 5 });
      expect(ErrorUtils.toWebDavStatus(newNetworkError())).toEqual({ statusCode: 503, retryAfter: 5 });
    });

    test('when the error carries no status at all, then it is an internal failure', () => {
      expect(ErrorUtils.toWebDavStatus(new Error('boom'))).toEqual({ statusCode: 500 });
    });
  });

  describe('getStatusCode', () => {
    test('when the error exposes statusCode or status, then it is returned', () => {
      expect(ErrorUtils.getStatusCode(new NotFoundError('gone'))).toBe(404);
      expect(ErrorUtils.getStatusCode({ status: 503 })).toBe(503);
      expect(ErrorUtils.getStatusCode({ statusCode: 409, status: 500 })).toBe(409);
    });

    test('when the error has no usable status, then nothing is returned', () => {
      expect(ErrorUtils.getStatusCode(new Error('boom'))).toBeUndefined();
      expect(ErrorUtils.getStatusCode({ status: 'nope' })).toBeUndefined();
      expect(ErrorUtils.getStatusCode(null)).toBeUndefined();
    });
  });

  test('when a reported error has a request id, then it is logged with it', () => {
    const error = Object.assign(new Error('Test Error'), { xRequestId: 'req-123' });

    ErrorUtils.report(error);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('[REPORTED_ERROR]: Test Error (requestId: req-123)'),
    );
  });
});
