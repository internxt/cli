import { Logger } from 'winston';
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
        `[REPORTED_ERROR]: ${this.withRequestId(error.message, error)}\n` +
          `Properties => ${JSON.stringify(props, null, 2)}\nStack => ${error.stack}`,
      );
    } else {
      logger.error(
        `[REPORTED_ERROR]: ${this.withRequestId(JSON.stringify(error), error)}\n` +
          `Properties => ${JSON.stringify(props, null, 2)}\n`,
      );
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

  static readonly getRequestId = (error: unknown): string | undefined => {
    if (typeof error !== 'object' || error === null) return undefined;

    const { requestId, xRequestId, data } = error as { requestId?: unknown; xRequestId?: unknown; data?: unknown };
    const bodyRequestId =
      typeof data === 'object' && data !== null ? (data as { requestId?: unknown }).requestId : undefined;

    return [requestId, xRequestId, bodyRequestId].find(
      (candidate): candidate is string => typeof candidate === 'string' && candidate.length > 0,
    );
  };

  static readonly withRequestId = (message: string, error: unknown): string => {
    const requestId = this.getRequestId(error);
    return requestId ? `${message} (requestId: ${requestId})` : message;
  };

  static readonly isNotFoundError = (error: unknown): boolean => {
    if (typeof error !== 'object' || error === null) return false;
    const { status, statusCode } = error as { status?: unknown; statusCode?: unknown };
    return status === 404 || statusCode === 404;
  };

  static readonly logIfUnexpected = (
    log: Logger,
    message: string,
    error: unknown,
    meta?: Record<string, unknown>,
  ) => {
    if (this.isNotFoundError(error)) return;
    const errorMessage = this.isError(error) ? error.message : String(error);
    log.warn(this.withRequestId(`${message}: ${errorMessage}`, error), meta);
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

export class PreconditionFailedError extends Error {
  public statusCode = 412;

  constructor(message: string) {
    super(message);
    this.name = 'PreconditionFailedError';
    Object.setPrototypeOf(this, PreconditionFailedError.prototype);
  }
}

export class RangeNotSatisfiableError extends Error {
  public statusCode = 416;

  constructor(message: string) {
    super(message);
    this.name = 'RangeNotSatisfiableError';
    Object.setPrototypeOf(this, RangeNotSatisfiableError.prototype);
  }
}
