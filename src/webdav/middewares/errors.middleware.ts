import { ErrorRequestHandler } from 'express';
import { webdavLogger } from '../../utils/logger.utils';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const ErrorHandlingMiddleware: ErrorRequestHandler = (err, req, res, _) => {
  webdavLogger.error(`[ERROR MIDDLEWARE] [${req.method.toUpperCase()} - ${req.url}]`, err);
  if ('statusCode' in err) {
    res.status(err.statusCode as number).send({
      error: {
        message: err.message,
      },
    });
  } else {
    res.status(500).send({
      error: {
        message: 'message' in err ? err.message : 'Something went wrong',
      },
    });
  }
};
