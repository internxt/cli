import { RequestHandler } from 'express';
import { ConfigService } from '../../services/config.service';

export const AuthMiddleware = (configService: ConfigService): RequestHandler => {
  return async (req, res, next) => {
    try {
      const credentials = await configService.readUser();
      if (!credentials) throw new Error('Unauthorized');
      req.user = {
        rootFolderId: credentials.user.root_folder_id,
      };
      next();
    } catch (error) {
      res.status(401).send({ error: (error as Error).message ?? 'Unauthorized' });
    }
  };
};