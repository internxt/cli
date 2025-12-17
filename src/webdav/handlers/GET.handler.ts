import { WebDavMethodHandler } from '../../types/webdav.types';
import { Request, Response } from 'express';
import { WebDavUtils } from '../../utils/webdav.utils';
import { DriveFileService } from '../../services/drive/drive-file.service';
import { NetworkFacade } from '../../services/network/network-facade.service';
import { DownloadService } from '../../services/network/download.service';
import { CryptoService } from '../../services/crypto.service';
import { AuthService } from '../../services/auth.service';
import { NotFoundError } from '../../utils/errors.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { NetworkUtils } from '../../utils/network.utils';
import { NotValidFileIdError } from '../../types/command.types';

export class GETRequestHandler implements WebDavMethodHandler {
  constructor(
    private readonly dependencies: {
      driveFileService: DriveFileService;
      downloadService: DownloadService;
      cryptoService: CryptoService;
      authService: AuthService;
      networkFacade: NetworkFacade;
    },
  ) {}

  handle = async (req: Request, res: Response) => {
    const { driveFileService, authService, networkFacade } = this.dependencies;
    const resource = await WebDavUtils.getRequestedResource(req.url);

    if (resource.name.startsWith('._')) throw new NotFoundError('File not found');

    webdavLogger.info(`[GET] Request received item at ${resource.url}`);
    const driveFile = await WebDavUtils.getDriveFileFromResource({
      url: resource.url,
      driveFileService,
    });

    if (!driveFile) {
      throw new NotFoundError(
        `Resource not found on Internxt Drive at ${resource.url}, if trying to access a folder use PROPFIND instead.`,
      );
    }

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

    if (contentLength === 0 || driveFile.size === 0) {
      webdavLogger.info(`[GET] [${driveFile.uuid}] File is empty, replying to client`);
      res.header('Content-length', '0');
      res.status(200);
      res.end();
    } else {
      res.header('Content-length', contentLength.toString());

      const writable = new WritableStream({
        write(chunk) {
          res.write(chunk);
        },
        close() {
          res.end();
        },
      });

      if (!driveFile.fileId) {
        throw new NotValidFileIdError();
      }

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
    }

    webdavLogger.info(`[GET] [${driveFile.uuid}] ✅ Download ready, replying to client`);
  };
}
