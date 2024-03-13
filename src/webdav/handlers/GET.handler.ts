import { WebDavMethodHandler, WebDavRequestedResource } from '../../types/webdav.types';
import { Request, Response } from 'express';
import { WebDavUtils } from '../../utils/webdav.utils';
import { DriveFileService } from '../../services/drive/drive-file.service';
import { DriveRealmManager } from '../../services/realms/drive-realm-manager.service';
import { SdkManager } from '../../services/sdk-manager.service';
import { NetworkFacade } from '../../services/network/network-facade.service';
import { UploadService } from '../../services/network/upload.service';
import { DownloadService } from '../../services/network/download.service';
import { CryptoService } from '../../services/crypto.service';
import { AuthService } from '../../services/auth.service';
import { DriveFileRealmSchema } from '../../services/realms/drive-files.realm';
import { NotFoundError, NotImplementedError } from '../../utils/errors.utils';
import { webdavLogger } from '../../utils/logger.utils';

export class GETRequestHandler implements WebDavMethodHandler {
  constructor(
    private dependencies: {
      driveFileService: DriveFileService;
      driveRealmManager: DriveRealmManager;
      uploadService: UploadService;
      downloadService: DownloadService;
      cryptoService: CryptoService;
      authService: AuthService;
    },
  ) {}
  handle = async (req: Request, res: Response) => {
    const resource = WebDavUtils.getRequestedResource(req);

    if (req.headers['content-range'] || req.headers['range'])
      throw new NotImplementedError('Range requests not supported');
    if (resource.name.startsWith('._')) throw new NotFoundError('File not found');

    webdavLogger.info(`GET request received for file at ${resource.url}`);
    const driveFile = await this.getDriveFileRealmObject(resource);

    if (!driveFile) {
      throw new NotFoundError('Drive file not found');
    }

    webdavLogger.info(`✅ Found Drive File with uuid ${driveFile.uuid}`);

    res.set('Content-Type', 'application/octet-stream');
    res.set('Content-length', driveFile.size.toString());

    const { mnemonic } = await this.dependencies.authService.getAuthDetails();
    const network = await this.getNetwork();
    webdavLogger.info('✅ Network ready for download');

    const writable = new WritableStream({
      write(chunk) {
        res.write(chunk);
      },
      close() {
        res.end();
      },
    });

    const [executeDownload] = await network.downloadToStream(driveFile.bucket, mnemonic, driveFile.file_id, writable, {
      progressCallback: (progress) => {
        webdavLogger.info(`Download progress for file ${resource.name}: ${progress}%`);
      },
    });
    webdavLogger.info('✅ Download prepared, executing...');
    res.status(200);

    await executeDownload;

    webdavLogger.info('✅ Download ready, replying to client');
  };

  private async getNetwork() {
    const { uploadService, downloadService, cryptoService, authService } = this.dependencies;
    const user = await authService.getUser();
    const networkModule = SdkManager.instance.getNetwork({
      user: user.bridgeUser,
      pass: user.userId,
    });

    return new NetworkFacade(networkModule, uploadService, downloadService, cryptoService);
  }
  private async getDriveFileRealmObject(resource: WebDavRequestedResource) {
    const { driveRealmManager } = this.dependencies;

    const result = await driveRealmManager.findByRelativePath(resource.url);

    return result as DriveFileRealmSchema | null;
  }
}
