import { Request, Response } from 'express';
import path from 'path';
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
    const contentLength = req.header('content-length') ? Number(req.header('content-length')) : undefined;
    if (!contentLength || isNaN(contentLength) || contentLength <= 0) {
      throw new UnsupportedMediaTypeError('Empty files are not supported');
    }

    const resource = WebDavUtils.getRequestedResource(req, this.dependencies.driveRealmManager);
    const driveFolder = await this.getDriveFolderRealmObject(resource);

    if (resource.type === 'file' || !driveFolder) {
      //TODO maybe we should call/make the 'propfind' logic here if destination folder has not been found on realm database
      throw new NotFoundError('Drive destination folder not found');
    }

    const { user, mnemonic } = await this.dependencies.authService.getAuthDetails();

    const [uploadPromise] = await this.dependencies.networkFacade.uploadFromStream(
      user.bucket,
      mnemonic,
      contentLength,
      StreamUtils.requestToReadableStream(req),
    );

    const uploadResult = await uploadPromise;

    const fileInfo = path.parse(decodeURI(req.url));

    await DriveFileService.instance.createFile({
      name: fileInfo.name,
      type: fileInfo.ext.replaceAll('.', ''),
      size: contentLength,
      folderId: driveFolder.id,
      fileId: uploadResult.fileId,
      bucket: user.bucket,
    });

    res.status(200);
    res.send();
  };

  private async getDriveFolderRealmObject(resource: WebDavRequestedResource) {
    const { driveRealmManager } = this.dependencies;
    const result = driveRealmManager.findByRelativePath(resource.path.dir);
    return result as DriveFolderRealmSchema | null;
  }
}
