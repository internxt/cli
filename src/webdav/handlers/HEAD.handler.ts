import { Request, Response } from 'express';
import { WebDavMethodHandler } from '../../types/webdav.types';
import { WebDavUtils } from '../../utils/webdav.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { DriveFileService } from '../../services/drive/drive-file.service';
import { DriveDatabaseManager } from '../../services/database/drive-database-manager.service';
import { DriveFileItem } from '../../types/drive.types';
import { NetworkUtils } from '../../utils/network.utils';

export class HEADRequestHandler implements WebDavMethodHandler {
  constructor(
    private readonly dependencies: {
      driveFileService: DriveFileService;
      driveDatabaseManager: DriveDatabaseManager;
    },
  ) {}

  handle = async (req: Request, res: Response) => {
    const { driveDatabaseManager, driveFileService } = this.dependencies;
    const resource = await WebDavUtils.getRequestedResource(req);

    if (resource.type === 'folder') {
      res.status(200).send();
      return;
    }

    webdavLogger.info(`[HEAD] Request received for ${resource.type} at ${resource.url}`);
    const driveFile = (await WebDavUtils.getAndSearchItemFromResource({
      resource,
      driveDatabaseManager,
      driveFileService,
    })) as DriveFileItem;

    webdavLogger.info(`[HEAD] [${driveFile.uuid}] Found Drive File`);

    const range = req.headers['range'];
    const rangeOptions = NetworkUtils.parseRangeHeader({
      range,
      totalFileSize: driveFile.size,
    });
    let contentLength = driveFile.size;
    if (rangeOptions) {
      webdavLogger.info(`[HEAD] [${driveFile.uuid}] Range request received:`, { rangeOptions });
      contentLength = rangeOptions.rangeSize;
    }

    res.header('Content-Type', 'application/octet-stream');
    res.header('Content-length', contentLength.toString());
    res.status(200).send();
  };
}
