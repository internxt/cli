import { RequestHandler } from 'express';
import { SdkManager } from '../../services/sdk-manager.service';
import { AuthService } from '../../services/auth.service';
import { webdavLogger } from '../../utils/logger.utils';
import { XMLUtils } from '../../utils/xml.utils';

export const AuthMiddleware = (authService: AuthService): RequestHandler => {
  return (_, res, next) => {
    (async () => {
      try {
        const { token } = await authService.getAuthDetails();
        SdkManager.init({ token });
        next();
      } catch (error) {
        let message = 'Authentication required to access this resource.';
        if ('message' in (error as Error) && (error as Error).message.trim().length > 0) {
          message = (error as Error).message;
        }

        webdavLogger.error('Error from AuthMiddleware: ' + message);

        const errorBodyXML = XMLUtils.toWebDavXML(
          {
            [XMLUtils.addDefaultNamespace('responsedescription')]: message,
          },
          {},
          'error',
        );
        res.status(401).send(errorBodyXML);
      }
    })();
  };
};
