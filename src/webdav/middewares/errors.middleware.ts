import { ErrorRequestHandler } from 'express';
import { webdavLogger } from '../../utils/logger.utils';
import { XMLUtils } from '../../utils/xml.utils';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const ErrorHandlingMiddleware: ErrorRequestHandler = (err, req, res, _) => {
  webdavLogger.error(`[ERROR MIDDLEWARE] [${req.method.toUpperCase()} - ${req.url}]`, err);

  const errorBodyXML = XMLUtils.toWebDavXML(
    {
      [XMLUtils.addDefaultNamespace('responsedescription')]: 'message' in err ? err.message : 'Something went wrong',
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
