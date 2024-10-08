import { RequestHandler } from 'express';
import { ConfigService } from '../../services/config.service';
import { SdkManager } from '../../services/sdk-manager.service';

export const AuthMiddleware = (configService: ConfigService): RequestHandler => {
  return (req, res, next) => {
    (async () => {
      try {
        const credentials = await configService.readUser();
        if (!credentials) throw new Error('Unauthorized');
        SdkManager.init({
          token: credentials.token,
          newToken: credentials.newToken,
        });
        req.user = {
          uuid: credentials.user.uuid,
          rootFolderId: credentials.user.root_folder_id,
        };
        next();
      } catch (error) {
        res.status(401).send({ error: (error as Error).message });
      }
    })();
  };
};
