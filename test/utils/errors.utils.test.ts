import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorUtils } from '../../src/utils/errors.utils';
import { logger } from '../../src/utils/logger.utils';

describe('Errors Utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('When reporting an error, should log with the expected message and properties', () => {
    const error = new Error('Test Error');
    const props = { key: 'value' };

    ErrorUtils.report(error, props);

    expect(logger.error).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledWith(
      `[REPORTED_ERROR]: ${error.message}\nProperties => ${JSON.stringify(props, null, 2)}\nStack => ${error.stack}`,
    );
  });

  it('When reporting an object, should log with the expected message and properties', () => {
    const error = { data: 'error data' };
    const props = { key: 'value' };

    ErrorUtils.report(error, props);

    expect(logger.error).toHaveBeenCalledOnce();
    expect(logger.error).toHaveBeenCalledWith(
      `[REPORTED_ERROR]: ${JSON.stringify(error)}\nProperties => ${JSON.stringify(props, null, 2)}\n`,
    );
  });
  describe('isAlreadyExistsError', () => {
    it('should properly detect an error object that has an already exists as message', () => {
      const error = new Error('File already exists');

      expect(ErrorUtils.isAlreadyExistsError(error)).toBe(true);
    });

    it('should properly detect an error object that has 409 as status', () => {
      const error = { status: 409, message: 'Conflict' };

      expect(ErrorUtils.isAlreadyExistsError(error)).toBe(true);
    });

    it('should return false if the passed error is not an object', () => {
      expect(ErrorUtils.isAlreadyExistsError('string error')).toBe(false);
      expect(ErrorUtils.isAlreadyExistsError(123)).toBe(false);
      expect(ErrorUtils.isAlreadyExistsError(null)).toBe(false);
      expect(ErrorUtils.isAlreadyExistsError(undefined)).toBe(false);
    });
  });

  describe('isFileNotFoundError', () => {
    it('should return true when error has code ENOENT', () => {
      const error = new Error('File not found');
      Object.assign(error, { code: 'ENOENT' });

      expect(ErrorUtils.isFileNotFoundError(error)).toBe(true);
    });

    it('should return true when error is a real ENOENT error from fs operations', () => {
      const error = Object.assign(new Error('ENOENT: no such file or directory'), {
        code: 'ENOENT',
        errno: -2,
        syscall: 'open',
        path: '/nonexistent/file.txt',
      });

      expect(ErrorUtils.isFileNotFoundError(error)).toBe(true);
    });

    it('should return false when error has a different error code', () => {
      const error = new Error('Permission denied');
      Object.assign(error, { code: 'EACCES' });

      expect(ErrorUtils.isFileNotFoundError(error)).toBe(false);
    });

    it('should return false when error has no code property', () => {
      const error = new Error('Some error');

      expect(ErrorUtils.isFileNotFoundError(error)).toBe(false);
    });

    it('should return false when error is not an Error object', () => {
      expect(ErrorUtils.isFileNotFoundError({ code: 'ENOENT' })).toBe(false);
      expect(ErrorUtils.isFileNotFoundError('ENOENT')).toBe(false);
      expect(ErrorUtils.isFileNotFoundError(null)).toBe(false);
      expect(ErrorUtils.isFileNotFoundError(undefined)).toBe(false);
      expect(ErrorUtils.isFileNotFoundError(123)).toBe(false);
    });
  });
});
