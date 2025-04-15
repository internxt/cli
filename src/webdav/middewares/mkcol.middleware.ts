import { RequestHandler } from 'express';

export const MkcolMiddleware: RequestHandler = (req, _, next) => {
  // if request content types are not 'application/xml', 'text/xml' or not defined, return 415
  if (req.method === 'MKCOL') {
    let contentType = req.headers['Content-Type'];
    if (contentType && contentType.length > 0) {
      if (Array.isArray(contentType)) {
        contentType = contentType[0];
      }
      contentType = contentType.toLowerCase().trim();

      if (contentType !== 'application/xml' && contentType !== 'text/xml') {
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
