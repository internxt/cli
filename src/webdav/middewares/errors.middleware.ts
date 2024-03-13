import { ErrorRequestHandler } from 'express';

export const ErrorHandlingMiddleware: ErrorRequestHandler = (err, _, res, __) => {
  if ('statusCode' in err) {
    res.status(err.statusCode as number).send({
      error: {
        message: err.message,
      },
    });
  } else {
    res.status(500).send({
      error: {
        message: 'Something went wrong',
      },
    });
  }
};
