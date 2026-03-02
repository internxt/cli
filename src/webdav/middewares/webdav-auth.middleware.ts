import { RequestHandler } from 'express';
import { webdavLogger } from '../../utils/logger.utils';
import { XMLUtils } from '../../utils/xml.utils';
import { WebdavConfig } from '../../types/command.types';

export const WebDAVAuthMiddleware = (configs: WebdavConfig): RequestHandler => {
  return (req, res, next) => {
    (async () => {
      if (configs.customAuth) {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
          webdavLogger.info('No authentication provided, proceeding with anonymous access');
          next();
          return;
        }

        // Parse Basic Authentication
        if (!authHeader.startsWith('Basic ')) {
          throw new Error('Unsupported authentication method. Only Basic authentication is supported.');
        }

        const base64Credentials = authHeader.substring(6); // Remove 'Basic ' prefix
        const credentials = Buffer.from(base64Credentials, 'base64').toString('utf-8');
        const [username, password] = credentials.split(':');

        if (!username || !password) {
          throw new Error('Invalid authentication credentials format.');
        }

        if (username !== configs.username || password !== configs.password) {
          const message = 'Authentication failed. Please check your WebDAV custom credentials.';

          const errorBodyXML = XMLUtils.toWebDavXML(
            {
              [XMLUtils.addDefaultNamespace('responsedescription')]: message,
            },
            {},
            'error',
          );

          // Send 401 with WWW-Authenticate header to prompt client for credentials
          res.setHeader('WWW-Authenticate', 'Basic realm="WebDAV Server"');
          res.status(401).send(errorBodyXML);
          return;
        } else {
          webdavLogger.info(`User authenticated successfully: ${username}`);
          next();
        }
      } else {
        next();
        return;
      }
    })();
  };
};
