import { RequestHandler } from 'express';

export const MkcolMiddleware: RequestHandler = (req, _, next) => {
  // if request content types are not 'application/xml', 'text/xml' or not defined, return 415
  if (req.method === 'MKCOL') {
    if (req.get('Content-Type')) {
      if (!req.is('application/xml') && !req.is('text/xml')) {
        return next({
          status: 415,
          message: 'Unsupported Media Type',
        });
      }
    }
    // body must be empty
    if (req.body && Object.keys(req.body).length > 0) {
      return next({
        status: 415,
        message: 'Unsupported Media Type',
      });
    }
  }

  next();
};
