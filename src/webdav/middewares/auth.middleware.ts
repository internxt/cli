import { RequestHandler } from 'express';
import { ConfigService } from '../../services/config.service';
import { SdkManager } from '../../services/sdk-manager.service';

export const AuthMiddleware = (configService: ConfigService): RequestHandler => {
  return async (req, res, next) => {
    try {
      const credentials = await configService.readUser();
      if (!credentials) throw new Error('Unauthorized');
      SdkManager.init({
        token: credentials.token,
        newToken: credentials.newToken,
      });
      req.user = {
        rootFolderId: credentials.user.root_folder_id,
      };
      next();
    } catch (error) {
      res.status(401).send({ error: (error as Error).message });
    }
  };
};
