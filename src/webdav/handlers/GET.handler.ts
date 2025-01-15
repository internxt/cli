import { WebDavMethodHandler } from '../../types/webdav.types';
import { Request, Response } from 'express';
import { WebDavUtils } from '../../utils/webdav.utils';
import { DriveFileService } from '../../services/drive/drive-file.service';
import { DriveDatabaseManager } from '../../services/database/drive-database-manager.service';
import { NetworkFacade } from '../../services/network/network-facade.service';
import { DownloadService } from '../../services/network/download.service';
import { CryptoService } from '../../services/crypto.service';
import { AuthService } from '../../services/auth.service';
import { NotFoundError } from '../../utils/errors.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { DriveFileItem } from '../../types/drive.types';
import { NetworkUtils } from '../../utils/network.utils';

export class GETRequestHandler implements WebDavMethodHandler {
  constructor(
    private readonly dependencies: {
      driveFileService: DriveFileService;
      driveDatabaseManager: DriveDatabaseManager;
      downloadService: DownloadService;
      cryptoService: CryptoService;
      authService: AuthService;
      networkFacade: NetworkFacade;
    },
  ) {}

  handle = async (req: Request, res: Response) => {
    const { driveDatabaseManager, driveFileService, authService, networkFacade } = this.dependencies;
    const resource = await WebDavUtils.getRequestedResource(req);

    if (resource.name.startsWith('._')) throw new NotFoundError('File not found');
    if (resource.type === 'folder') throw new NotFoundError('Folders cannot be listed with GET. Use PROPFIND instead.');

    webdavLogger.info(`[GET] Request received for ${resource.type} at ${resource.url}`);
    const driveFile = (await WebDavUtils.getAndSearchItemFromResource({
      resource,
      driveDatabaseManager,
      driveFileService,
    })) as DriveFileItem;

    webdavLogger.info(`[GET] [${driveFile.uuid}] Found Drive File`);

    const { user } = await authService.getAuthDetails();
    webdavLogger.info(`[GET] [${driveFile.uuid}] Network ready for download`);

    const range = req.headers['range'];
    const rangeOptions = NetworkUtils.parseRangeHeader({
      range,
      totalFileSize: driveFile.size,
    });
    let contentLength = driveFile.size;
    if (rangeOptions) {
      webdavLogger.info(`[GET] [${driveFile.uuid}] Range request received:`, { rangeOptions });
      contentLength = rangeOptions.rangeSize;
    }

    res.header('Content-Type', 'application/octet-stream');
    res.header('Content-length', contentLength.toString());

    const writable = new WritableStream({
      write(chunk) {
        res.write(chunk);
      },
      close() {
        res.end();
      },
    });

    const [executeDownload] = await networkFacade.downloadToStream(
      driveFile.bucket,
      user.mnemonic,
      driveFile.fileId,
      contentLength,
      writable,
      rangeOptions,
    );
    webdavLogger.info(`[GET] [${driveFile.uuid}] Download prepared, executing...`);
    res.status(200);

    await executeDownload;

    webdavLogger.info(`[GET] [${driveFile.uuid}] ✅ Download ready, replying to client`);
  };
}
