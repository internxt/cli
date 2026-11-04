import { ErrorRequestHandler } from 'express';
import { webdavLogger } from '../../utils/logger.utils';
import { XMLUtils } from '../../utils/xml.utils';
import { ErrorUtils } from '../../utils/errors.utils';
import { ClientVersionGate } from './client-version.middleware';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const ErrorHandlingMiddleware: ErrorRequestHandler = (rawErr, req, res, _) => {
  const versionUnsupported = ErrorUtils.isClientVersionUnsupported(rawErr);
  const err = versionUnsupported ? ClientVersionGate.block(rawErr) : rawErr;

  let message = ErrorUtils.isError(err) ? err.message : 'Something went wrong';

  const detail = ErrorUtils.getResponseMessage(err);
  if (detail) {
    message += ` [${detail}]`;
  }

  const logMessage = ErrorUtils.withRequestId(message, rawErr);

  if (!versionUnsupported) {
    const stack = ErrorUtils.isError(err) && err.stack ? `\nStack: ${err.stack}` : '';
    webdavLogger.error(`[ERROR MIDDLEWARE] [${req.method.toUpperCase()} - ${req.url}] ${logMessage}${stack}`);
  }

  const errorBodyXML = XMLUtils.toWebDavXML(
    {
      [XMLUtils.addDefaultNamespace('responsedescription')]: message,
    },
    {},
    'error',
  );

  const { statusCode, retryAfter } = ErrorUtils.toWebDavStatus(err);

  if (retryAfter !== undefined) {
    res.set('Retry-After', String(retryAfter));
  }

  res.set('Content-Type', 'application/xml; charset="utf-8"');
  res.status(statusCode).send(errorBodyXML);

  // If the client hasn't finished sending the request body (e.g. a large PUT rejected early by
  // a size check), abort the connection instead of waiting for it to finish streaming data that
  // will never be read. Otherwise let the response flush normally so the connection can be
  // reused for keep-alive, instead of forcing every trivial error (404, 409, 415...) to reset it.
  if (!req.complete) {
    req.destroy();
  }
};
