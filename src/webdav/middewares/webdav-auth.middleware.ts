import { RequestHandler, Response } from 'express';
import { XMLUtils } from '../../utils/xml.utils';
import { WebdavConfig } from '../../types/command.types';

export const WebDAVAuthMiddleware = (configs: WebdavConfig): RequestHandler => {
  return (req, res, next) => {
    (async () => {
      if (configs.customAuth) {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
          return sendUnauthorizedError(res, 'Missing Authorization header.');
        }

        // Parse Basic Authentication
        if (!authHeader.startsWith('Basic ')) {
          return sendUnauthorizedError(
            res,
            'Unsupported authentication method. Only Basic authentication is supported.',
          );
        }

        const base64Credentials = authHeader.substring(6); // Remove 'Basic ' prefix
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [username, password] = credentials.split(':');

        if (!username || !password) {
          return sendUnauthorizedError(res, 'Invalid authentication credentials format.');
        }

        if (username !== configs.username || password !== configs.password) {
          return sendUnauthorizedError(res, 'Authentication failed. Please check your WebDAV custom credentials.');
        } else {
          next();
          return;
        }
      } else {
        next();
        return;
      }
    })();
  };
};

const sendUnauthorizedError = (res: Response, message: string) => {
  const errorBodyXML = XMLUtils.toWebDavXML(
    {
      [XMLUtils.addDefaultNamespace('responsedescription')]: message,
    },
    {},
    'error',
  );

  res.status(401).send(errorBodyXML);
  return;
};
