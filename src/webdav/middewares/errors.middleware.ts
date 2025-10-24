import { ErrorRequestHandler } from 'express';
import { webdavLogger } from '../../utils/logger.utils';
import { XMLUtils } from '../../utils/xml.utils';
import { isError } from '../../utils/errors.utils';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const ErrorHandlingMiddleware: ErrorRequestHandler = (err, req, res, _) => {
  const message = isError(err) ? err.message : 'Something went wrong';

  if (isError(err) && err.stack) {
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

  let statusCode = 500;
  if ('statusCode' in err && !isNaN(err.statusCode)) {
    statusCode = err.statusCode;
  }

  res.status(statusCode).send(errorBodyXML);
};
