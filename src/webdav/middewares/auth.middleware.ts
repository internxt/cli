import { RequestHandler } from 'express';
import { SdkManager } from '../../services/sdk-manager.service';
import { AuthService } from '../../services/auth.service';
import { webdavLogger } from '../../utils/logger.utils';

export const AuthMiddleware = (authService: AuthService): RequestHandler => {
  return (req, res, next) => {
    (async () => {
      try {
        const { token, newToken, user } = await authService.getAuthDetails();
        SdkManager.init({
          token,
          newToken,
        });
        req.user = {
          uuid: user.uuid,
          rootFolderId: user.root_folder_id,
        };
        next();
      } catch (error) {
        webdavLogger.error('Error from AuthMiddleware: ' + (error as Error).message);
        res.status(401).send({ error: (error as Error).message });
      }
    })();
  };
};
