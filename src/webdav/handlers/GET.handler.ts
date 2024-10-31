import { WebDavMethodHandler } from '../../types/webdav.types';
import { Request, Response } from 'express';
import { WebDavUtils } from '../../utils/webdav.utils';
import { DriveFileService } from '../../services/drive/drive-file.service';
import { DriveDatabaseManager } from '../../services/database/drive-database-manager.service';
import { NetworkFacade } from '../../services/network/network-facade.service';
import { UploadService } from '../../services/network/upload.service';
import { DownloadService } from '../../services/network/download.service';
import { CryptoService } from '../../services/crypto.service';
import { AuthService } from '../../services/auth.service';
import { NotFoundError, NotImplementedError } from '../../utils/errors.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { DriveFileItem } from '../../types/drive.types';

export class GETRequestHandler implements WebDavMethodHandler {
  constructor(
    private dependencies: {
      driveFileService: DriveFileService;
      driveDatabaseManager: DriveDatabaseManager;
      uploadService: UploadService;
      downloadService: DownloadService;
      cryptoService: CryptoService;
      authService: AuthService;
      networkFacade: NetworkFacade;
    },
  ) {}

  handle = async (req: Request, res: Response) => {
    const { driveDatabaseManager, driveFileService, authService, networkFacade } = this.dependencies;
    const resource = await WebDavUtils.getRequestedResource(req);

    if (req.headers['content-range'] || req.headers['range'])
      throw new NotImplementedError('Range requests not supported');
    if (resource.name.startsWith('._')) throw new NotFoundError('File not found');

    webdavLogger.info(`GET request received for file at ${resource.url}`);
    const driveFile = (await WebDavUtils.getAndSearchItemFromResource({
      resource,
      driveDatabaseManager,
      driveFileService,
    })) as DriveFileItem;

    webdavLogger.info(`✅ Found Drive File with uuid ${driveFile.uuid}`);

    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-length', driveFile.size.toString());

    const { mnemonic } = await authService.getAuthDetails();
    webdavLogger.info('✅ Network ready for download');

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
      mnemonic,
      driveFile.fileId,
      writable,
      {
        progressCallback: (progress) => {
          webdavLogger.info(`Download progress for file ${resource.name}: ${(100 * progress).toFixed(2)}%`);
        },
      },
    );
    webdavLogger.info('✅ Download prepared, executing...');
    res.status(200);

    await executeDownload;

    webdavLogger.info('✅ Download ready, replying to client');
  };
}
