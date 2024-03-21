import { Request, Response } from 'express';
import { DriveFileService } from '../../services/drive/drive-file.service';
import { DriveRealmManager } from '../../services/realms/drive-realm-manager.service';
import { NetworkFacade } from '../../services/network/network-facade.service';
import { UploadService } from '../../services/network/upload.service';
import { DownloadService } from '../../services/network/download.service';
import { CryptoService } from '../../services/crypto.service';
import { AuthService } from '../../services/auth.service';
import { DriveFolderRealmSchema } from '../../services/realms/drive-folders.realm';
import { WebDavMethodHandler, WebDavRequestedResource } from '../../types/webdav.types';
import { NotFoundError, UnsupportedMediaTypeError } from '../../utils/errors.utils';
import { StreamUtils } from '../../utils/stream.utils';
import { WebDavUtils } from '../../utils/webdav.utils';
import { webdavLogger } from '../../utils/logger.utils';

export class PUTRequestHandler implements WebDavMethodHandler {
  constructor(
    private dependencies: {
      driveFileService: DriveFileService;
      driveRealmManager: DriveRealmManager;
      uploadService: UploadService;
      downloadService: DownloadService;
      cryptoService: CryptoService;
      authService: AuthService;
      networkFacade: NetworkFacade;
    },
  ) {}

  handle = async (req: Request, res: Response) => {
    const contentLength = Number(req.headers['content-length']);
    if (!contentLength || isNaN(contentLength) || contentLength <= 0) {
      throw new UnsupportedMediaTypeError('Empty files are not supported');
    }

    const resource = WebDavUtils.getRequestedResource(req, this.dependencies.driveRealmManager);
    const driveFolder = await this.getDriveFolderRealmObject(resource);

    webdavLogger.info(`PUT request received for uploading file '${resource.name}' to '${resource.path.dir}'`);
    if (!driveFolder) {
      throw new NotFoundError('Drive destination folder not found');
    }

    const { user, mnemonic } = await this.dependencies.authService.getAuthDetails();

    const [uploadPromise, _] = await this.dependencies.networkFacade.uploadFromStreamUsingStream(
      user.bucket,
      mnemonic,
      contentLength,
      StreamUtils.requestToReadableStream(req),
      {
        progressCallback: (progress) => {
          webdavLogger.info(`Upload progress for file ${resource.name}: ${progress}%`);
        },
      },
    );
    const { fileId } = await uploadPromise;

    webdavLogger.info('✅ File uploaded to network');

    const file = await DriveFileService.instance.createFile({
      name: resource.path.name,
      type: resource.path.ext.replaceAll('.', ''),
      size: contentLength,
      folderId: driveFolder.id,
      fileId: fileId,
      bucket: user.bucket,
    });

    webdavLogger.info('✅ File uploaded to internxt drive');

    this.dependencies.driveRealmManager.createFile(file);

    res.status(200);
    res.send();
  };

  private async getDriveFolderRealmObject(resource: WebDavRequestedResource) {
    const { driveRealmManager } = this.dependencies;
    const result = driveRealmManager.findByRelativePath(resource.path.dir);
    return result as DriveFolderRealmSchema | null;
  }
}
