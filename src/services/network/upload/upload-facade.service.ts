import { basename } from 'node:path';
import { CLIUtils } from '../../../utils/cli.utils';
import { logger } from '../../../utils/logger.utils';
import { LocalFilesystemService } from '../../local-filesystem/local-filesystem.service';
import { UploadFolderParams } from './upload.types';
import { UploadFolderService } from './upload-folder.service';
import { UploadFileService } from './upload-file.service';
import { AsyncUtils } from '../../../utils/async.utils';

export class UploadFacade {
  static readonly instance = new UploadFacade();

  async uploadFolder({ localPath, destinationFolderUuid, loginUserDetails, jsonFlag, onProgress }: UploadFolderParams) {
    const timer = CLIUtils.timer();
    CLIUtils.doing('Preparing Network', jsonFlag);
    const network = await CLIUtils.prepareNetwork(loginUserDetails);
    CLIUtils.done(jsonFlag);
    const scanResult = await LocalFilesystemService.instance.scanLocalDirectory(localPath);
    logger.info(
      `Scanned folder ${localPath}: found ${scanResult.totalItems} items, total size ${scanResult.totalBytes} bytes.`,
    );

    const currentProgress = { itemsUploaded: 0, bytesUploaded: 0 };
    const emitProgress = () => {
      const itemProgress = currentProgress.itemsUploaded / scanResult.totalItems;
      const sizeProgress = currentProgress.bytesUploaded / scanResult.totalBytes;
      const percentage = Math.floor((itemProgress * 0.5 + sizeProgress * 0.5) * 100);
      onProgress({ percentage });
    };

    const folderMap = await UploadFolderService.instance.createFolders({
      foldersToCreate: scanResult.folders,
      destinationFolderUuid,
      currentProgress,
      emitProgress,
    });

    if (folderMap.size === 0) {
      throw new Error('Failed to create folders, cannot upload files');
    }
    // This aims to prevent this issue: https://inxt.atlassian.net/browse/PB-1446
    await AsyncUtils.sleep(500);

    const totalBytes = await UploadFileService.instance.uploadFilesConcurrently({
      network,
      filesToUpload: scanResult.files,
      folderMap,
      bucket: loginUserDetails.bucket,
      destinationFolderUuid,
      currentProgress,
      emitProgress,
    });

    const rootFolderName = basename(localPath);
    const rootFolderId = folderMap.get(rootFolderName) ?? '';
    return {
      totalBytes,
      rootFolderId,
      uploadTimeMs: timer.stop(),
    };
  }
}
