import { Logger } from 'winston';
import { logger } from './logger.utils';

export type LookupErrorKind = 'not-found' | 'auth' | 'inconclusive';

export const DEFAULT_RETRY_AFTER_SECONDS = 5;

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

  static readonly getStatusCode = (error: unknown, key?: 'statusCode' | 'status'): number | undefined => {
    if (typeof error !== 'object' || error === null) return undefined;

    const source = error as Record<string, unknown>;
    const value = key ? source[key] : (source.statusCode ?? source.status);
    return typeof value === 'number' && !Number.isNaN(value) ? value : undefined;
  };

  static readonly isNotFoundError = (error: unknown): boolean => {
    return this.getStatusCode(error) === 404;
  };

  private static readonly hasResponseBody = (error: unknown): boolean => {
    return typeof error === 'object' && error !== null && 'data' in error;
  };

  static readonly classifyLookupError = (error: unknown): LookupErrorKind => {
    const status = this.getStatusCode(error);

    if (status === 404) return 'not-found';
    if (status === undefined || !this.hasResponseBody(error)) return 'inconclusive';

    // The API rejects a malformed or over-long path with 400, which we cannot tell apart from the item being absent
    if (status === 400 || status === 414 || status === 422) return 'not-found';

    if (this.isAuthStatus(status)) return 'auth';
    return 'inconclusive';
  };

  private static readonly isAuthStatus = (status: number): boolean => status === 401 || status === 403;

  private static readonly isRetryableStatus = (status: number): boolean =>
    status === 408 || status === 425 || status === 429 || status >= 500;

  static readonly toWebDavStatus = (error: unknown): { statusCode: number; retryAfter?: number } => {
    const ownStatus = this.getStatusCode(error, 'statusCode');
    if (ownStatus !== undefined) {
      return error instanceof ServiceUnavailableError
        ? { statusCode: ownStatus, retryAfter: error.retryAfter }
        : { statusCode: ownStatus };
    }

    const apiStatus = this.getStatusCode(error, 'status');
    if (apiStatus === undefined) return { statusCode: 500 };

    if (!this.hasResponseBody(error) || this.isRetryableStatus(apiStatus)) {
      return { statusCode: 503, retryAfter: DEFAULT_RETRY_AFTER_SECONDS };
    }
    if (this.isAuthStatus(apiStatus)) return { statusCode: 502 };

    return { statusCode: apiStatus };
  };

  static readonly logIfUnexpected = (log: Logger, message: string, error: unknown, meta?: Record<string, unknown>) => {
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

/** The resource's state could not be determined; 503 asks the client to retry instead of
 * telling it the resource is gone, which makes clients re-create it. */
export class ServiceUnavailableError extends Error {
  public statusCode = 503;
  public retryAfter: number;

  constructor(message: string, retryAfter = DEFAULT_RETRY_AFTER_SECONDS) {
    super(message);
    this.name = 'ServiceUnavailableError';
    this.retryAfter = retryAfter;
    Object.setPrototypeOf(this, ServiceUnavailableError.prototype);
  }
}

/** The CLI reached the WebDAV client but not the Internxt API on its behalf. */
export class BadGatewayError extends Error {
  public statusCode = 502;

  constructor(message: string) {
    super(message);
    this.name = 'BadGatewayError';
    Object.setPrototypeOf(this, BadGatewayError.prototype);
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
