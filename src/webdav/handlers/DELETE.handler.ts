import { Request, Response } from 'express';
import { WebDavMethodHandler } from '../../types/webdav.types';
import { NotFoundError } from '../../utils/errors.utils';
import { WebDavUtils } from '../../utils/webdav.utils';
import { DriveDatabaseManager } from '../../services/database/drive-database-manager.service';
import { TrashService } from '../../services/drive/trash.service';
import { webdavLogger } from '../../utils/logger.utils';

export class DELETERequestHandler implements WebDavMethodHandler {
  constructor(private dependencies: { driveDatabaseManager: DriveDatabaseManager; trashService: TrashService }) {}
  handle = async (req: Request, res: Response) => {
    webdavLogger.info('DELETE request received');
    const resource = await WebDavUtils.getRequestedResource(req, this.dependencies.driveDatabaseManager);
    webdavLogger.info('Resource found for DELETE request', { resource });
    const databaseItem = await this.dependencies.driveDatabaseManager.findByRelativePath(resource.url);

    if (!databaseItem) throw new NotFoundError('Resource not found');

    webdavLogger.info(`Trashing ${resource.type} with UUID ${databaseItem.uuid}...`);
    await this.dependencies.trashService.trashItems({
      items: [{ type: resource.type, uuid: databaseItem.uuid }],
    });

    if (resource.type === 'folder') {
      await this.dependencies.driveDatabaseManager.updateFolder(databaseItem.id, {
        status: 'TRASHED',
      });
    }

    if (resource.type === 'file') {
      await this.dependencies.driveDatabaseManager.updateFile(databaseItem.id, {
        status: 'TRASHED',
      });
    }

    res.status(204).send();
  };
}
