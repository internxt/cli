import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorUtils } from '../../src/utils/errors.utils';

describe('Errors Utils', () => {
  const reporter = vi.fn();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When reporting an error, should call console.error with the expected message and properties', () => {
    const error = new Error('Test Error');
    const props = { key: 'value' };

    ErrorUtils.report(reporter, error, props);

    expect(reporter).toHaveBeenCalledOnce();
    expect(reporter).toHaveBeenCalledWith(
      `[REPORTED_ERROR]: ${error.message}\nProperties => ${JSON.stringify(props, null, 2)}\nStack => ${error.stack}`,
    );
  });

  it('When reporting an object, should call console.error with the expected message and properties', () => {
    const error = { data: 'error data' };
    const props = { key: 'value' };

    ErrorUtils.report(reporter, error, props);

    expect(reporter).toHaveBeenCalledOnce();
    expect(reporter).toHaveBeenCalledWith(
      `[REPORTED_ERROR]: ${JSON.stringify(error)}\nProperties => ${JSON.stringify(props, null, 2)}\n`,
    );
  });
});
