import { describe, expect, test } from 'vitest';
import { ErrorUtils } from '../../src/utils/errors.utils';
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
});
