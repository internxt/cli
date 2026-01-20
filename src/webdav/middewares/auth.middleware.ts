import { RequestHandler } from 'express';
import { SdkManager } from '../../services/sdk-manager.service';
import { AuthService } from '../../services/auth.service';
import { webdavLogger } from '../../utils/logger.utils';
import { XMLUtils } from '../../utils/xml.utils';
import { ErrorUtils } from '../../utils/errors.utils';

export const AuthMiddleware = (): RequestHandler => {
  return (_, res, next) => {
    (async () => {
      try {
        const { token, workspace } = await AuthService.instance.getAuthDetails();
        SdkManager.init({ token, workspaceToken: workspace?.workspaceCredentials.token });
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
