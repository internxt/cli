import { logger } from './logger.utils';

export class ErrorUtils {
  static readonly isError = (error: unknown): error is Error => {
    return typeof Error.isError === 'function'
      ? Error.isError(error)
      : error instanceof Error ||
          (typeof error === 'object' && error !== null && 'message' in error && ('stack' in error || 'name' in error));
  };

  static readonly report = (error: unknown, props: Record<string, unknown> = {}) => {
    if (this.isError(error)) {
      logger.error(
        `[REPORTED_ERROR]: ${error.message}\nProperties => ${JSON.stringify(props, null, 2)}\nStack => ${error.stack}`,
      );
    } else {
      logger.error(`[REPORTED_ERROR]: ${JSON.stringify(error)}\nProperties => ${JSON.stringify(props, null, 2)}\n`);
    }
  };

  static readonly isAlreadyExistsError = (error: unknown): error is Error => {
    return (
      (this.isError(error) && error.message.includes('already exists')) ||
      (typeof error === 'object' && error !== null && 'status' in error && error.status === 409)
    );
  };

  static readonly isFileNotFoundError = (error: unknown): error is NodeJS.ErrnoException => {
    return this.isError(error) && 'code' in error && error.code === 'ENOENT';
  };
}

export class ConflictError extends Error {
  public statusCode = 409;

  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
    Object.setPrototypeOf(this, ConflictError.prototype);
  }
}

export class NotFoundError extends Error {
  public statusCode = 404;

  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
    Object.setPrototypeOf(this, NotFoundError.prototype);
  }
}

export class BadRequestError extends Error {
  public statusCode = 400;

  constructor(message: string) {
    super(message);
    this.name = 'BadRequestError';
    Object.setPrototypeOf(this, BadRequestError.prototype);
  }
}

export class UnsupportedMediaTypeError extends Error {
  public statusCode = 415;

  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedMediaTypeError';
    Object.setPrototypeOf(this, UnsupportedMediaTypeError.prototype);
  }
}

export class MethodNotAllowed extends Error {
  public statusCode = 405;

  constructor(message: string) {
    super(message);
    this.name = 'MethodNotAllowed';
    Object.setPrototypeOf(this, MethodNotAllowed.prototype);
  }
}

export class NotImplementedError extends Error {
  public statusCode = 501;

  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
    Object.setPrototypeOf(this, NotImplementedError.prototype);
  }
}
