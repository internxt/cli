import { RequestHandler } from 'express';
import { UnsupportedMediaTypeError } from '../../utils/errors.utils';

export const MkcolMiddleware: RequestHandler = (req, _, next) => {
  // if request content types are not 'application/xml', 'text/xml' or not defined, return 415
  if (req.method === 'MKCOL') {
    let contentType = req.headers['Content-Type'] ?? req.get('content-type');
    if (contentType && contentType.length > 0) {
      if (Array.isArray(contentType)) {
        contentType = contentType[0];
      }
      contentType = contentType.toLowerCase().trim();

      if (contentType !== 'application/xml' && contentType !== 'text/xml') {
        throw new UnsupportedMediaTypeError('Unsupported Media Type');
      }
    }
    // body must be empty
    if (req.body && Object.keys(req.body).length > 0) {
      throw new UnsupportedMediaTypeError('Unsupported Media Type');
    }
  }

  next();
};
