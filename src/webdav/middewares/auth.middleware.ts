import { RequestHandler } from 'express';
import { SdkManager } from '../../services/sdk-manager.service';
import { AuthService } from '../../services/auth.service';
import { CacheService } from '../../services/cache.service';
import { webdavLogger } from '../../utils/logger.utils';
import { XMLUtils } from '../../utils/xml.utils';
import { ErrorUtils } from '../../utils/errors.utils';
import { LoginCredentials } from '../../types/command.types';

export const AuthMiddleware = (): RequestHandler => {
  return (_, res, next) => {
    (async () => {
      try {
        const cached = CacheService.instance.get<LoginCredentials>(CacheService.AUTH_CACHE_KEY);

        if (cached) {
          SdkManager.init({ token: cached.token, workspaceToken: cached.workspace?.workspaceCredentials?.token });
          next();
          return;
        }

        const authDetails = await AuthService.instance.getAuthDetails();
        CacheService.instance.set(CacheService.AUTH_CACHE_KEY, authDetails);
        next();
      } catch (error) {
        let message = 'Authentication required to access this resource.';
        if (ErrorUtils.isError(error)) {
          message = error.message;
          if (error.stack) {
            webdavLogger.error(`Error from AuthMiddleware: ${message}\nStack: ${error.stack}`);
          } else {
            webdavLogger.error(`Error from AuthMiddleware: ${message}`);
          }
        }
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
