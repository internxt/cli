import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorUtils, isAlreadyExistsError } from '../../src/utils/errors.utils';
import { logger } from '../../src/utils/logger.utils';

vi.mock('../../src/utils/logger.utils', () => ({
  logger: {
    error: vi.fn(),
  },
}));

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

      expect(isAlreadyExistsError(error)).toBe(true);
    });

    it('should properly detect an error object that has 409 as status', () => {
      const error = { status: 409, message: 'Conflict' };

      expect(isAlreadyExistsError(error)).toBe(true);
    });

    it('should return false if the passed error is not an object', () => {
      expect(isAlreadyExistsError('string error')).toBe(false);
      expect(isAlreadyExistsError(123)).toBe(false);
      expect(isAlreadyExistsError(null)).toBe(false);
      expect(isAlreadyExistsError(undefined)).toBe(false);
    });
  });
});
