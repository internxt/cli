import { Request, Response } from 'express';
import { DriveFileService } from '../../services/drive/drive-file.service';
import { NetworkFacade } from '../../services/network/network-facade.service';
import { UploadService } from '../../services/network/upload.service';
import { DownloadService } from '../../services/network/download.service';
import { CryptoService } from '../../services/crypto.service';
import { AuthService } from '../../services/auth.service';
import { WebDavMethodHandler, WebDavRequestedResource } from '../../types/webdav.types';
import { ConflictError, UnsupportedMediaTypeError } from '../../utils/errors.utils';
import { WebDavUtils } from '../../utils/webdav.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { DriveDatabaseManager } from '../../services/database/drive-database-manager.service';
import DriveFolderModel from '../../services/database/drive-folder/drive-folder.model';

export class PUTRequestHandler implements WebDavMethodHandler {
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
    const contentLength = Number(req.headers['content-length']);
    if (!contentLength || isNaN(contentLength) || contentLength <= 0) {
      throw new UnsupportedMediaTypeError('Empty files are not supported');
    }

    const resource = await WebDavUtils.getRequestedResource(req, this.dependencies.driveDatabaseManager);
    const driveFolder = await this.getDriveFolderRealmObject(resource);

    webdavLogger.info(`PUT request received for uploading file '${resource.name}' to '${resource.path.dir}'`);
    if (!driveFolder) {
      throw new ConflictError('Drive destination folder not found');
    }

    const { user, mnemonic } = await this.dependencies.authService.getAuthDetails();

    const [uploadPromise] = await this.dependencies.networkFacade.uploadFromStream(
      user.bucket,
      mnemonic,
      contentLength,
      req,
      {
        progressCallback: (progress) => {
          webdavLogger.info(`Upload progress for file ${resource.name}: ${(100*progress).toFixed(2)}%`);
        },
      },
    );

    const uploadResult = await uploadPromise;

    webdavLogger.info('✅ File uploaded to network');

    const file = await DriveFileService.instance.createFile({
      name: resource.path.name,
      type: resource.path.ext.replaceAll('.', ''),
      size: contentLength,
      folderId: driveFolder.id,
      fileId: uploadResult.fileId,
      bucket: user.bucket,
    });

    webdavLogger.info('✅ File uploaded to internxt drive');

    await this.dependencies.driveDatabaseManager.createFile(file);

    res.status(200);
    res.send();
  };

  private async getDriveFolderRealmObject(resource: WebDavRequestedResource) {
    const { driveDatabaseManager } = this.dependencies;
    const result = await driveDatabaseManager.findByRelativePath(resource.path.dir);
    return result as DriveFolderModel | null;
  }
}
