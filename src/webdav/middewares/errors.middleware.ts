import { ErrorRequestHandler } from 'express';
import { webdavLogger } from '../../utils/logger.utils';
import { XMLUtils } from '../../utils/xml.utils';
import { ErrorUtils } from '../../utils/errors.utils';

/**
 * SDK errors (AxiosResponseError/AxiosUnknownError) carry the upstream API's response
 * body in `data`, which is discarded unless we read it explicitly.
 */
const getErrorDetail = (err: unknown): string | undefined => {
  if (typeof err !== 'object' || err === null || !('data' in err)) return undefined;

  const data = (err as { data?: unknown }).data;
  if (typeof data !== 'object' || data === null || !('message' in data)) return undefined;

  const message = (data as { message?: unknown }).message;
  if (typeof message === 'string' && message.trim().length > 0) return message;
  if (Array.isArray(message) && message.length > 0) return message.join(', ');
  return undefined;
};

/**
 * The CLI's own errors (BadRequestError, NotFoundError, ...) expose `statusCode`,
 * but errors normalized by @internxt/sdk's HttpClient expose `status` instead.
 */
const getErrorStatusCode = (err: unknown): number | undefined => {
  if (typeof err !== 'object' || err === null) return undefined;

  const { statusCode, status } = err as { statusCode?: unknown; status?: unknown };
  if (typeof statusCode === 'number' && !Number.isNaN(statusCode)) return statusCode;
  if (typeof status === 'number' && !Number.isNaN(status)) return status;
  return undefined;
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const ErrorHandlingMiddleware: ErrorRequestHandler = (err, req, res, _) => {
  let message = ErrorUtils.isError(err) ? err.message : 'Something went wrong';

  const detail = getErrorDetail(err);
  if (detail) {
    message += ` [${detail}]`;
  }

  if (ErrorUtils.isError(err) && err.stack) {
    webdavLogger.error(`[ERROR MIDDLEWARE] [${req.method.toUpperCase()} - ${req.url}] ${message}\nStack: ${err.stack}`);
  } else {
    webdavLogger.error(`[ERROR MIDDLEWARE] [${req.method.toUpperCase()} - ${req.url}] ${message}`);
  }

  const errorBodyXML = XMLUtils.toWebDavXML(
    {
      [XMLUtils.addDefaultNamespace('responsedescription')]: message,
    },
    {},
    'error',
  );

  const statusCode = getErrorStatusCode(err) ?? 500;

  res.set('Content-Type', 'application/xml; charset="utf-8"');
  res.status(statusCode).send(errorBodyXML);
  req.destroy();
};
