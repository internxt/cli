import { ErrorRequestHandler } from 'express';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        message: 'message' in err ? err.message : 'Something went wrong',
      },
    });
  }
};
