import { dirname } from 'node:path';
import { isAlreadyExistsError } from '../../../utils/errors.utils';
import { logger } from '../../../utils/logger.utils';
import { DriveFolderService } from '../../drive/drive-folder.service';
import { CreateFoldersParams, CreateFolderWithRetryParams, DELAYS_MS, MAX_RETRIES } from './upload.types';

export class UploadFolderService {
  static readonly instance = new UploadFolderService();
  async createFolders({
    foldersToCreate,
    destinationFolderUuid,
    currentProgress,
    emitProgress,
  }: CreateFoldersParams): Promise<Map<string, string>> {
    const folderMap = new Map<string, string>();
    for (const folder of foldersToCreate) {
      const parentPath = dirname(folder.relativePath);
      const parentUuid = parentPath === '.' ? destinationFolderUuid : folderMap.get(parentPath);

      if (!parentUuid) {
        logger.warn(`Parent folder not found for ${folder.relativePath}, skipping...`);
        continue;
      }

      const createdFolderUuid = await this.createFolderWithRetry({
        folderName: folder.name,
        parentFolderUuid: parentUuid,
      });

      if (createdFolderUuid) {
        folderMap.set(folder.relativePath, createdFolderUuid);
        currentProgress.itemsUploaded++;
        emitProgress();
      }
    }
    return folderMap;
  }

  async createFolderWithRetry({ folderName, parentFolderUuid }: CreateFolderWithRetryParams): Promise<string | null> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const [createFolderPromise] = await DriveFolderService.instance.createFolder({
          plainName: folderName,
          parentFolderUuid,
        });

        const createdFolder = await createFolderPromise;
        return createdFolder.uuid;
      } catch (error: unknown) {
        if (isAlreadyExistsError(error)) {
          logger.info(`Folder ${folderName} already exists, skipping...`);
          return null;
        }
        if (attempt < MAX_RETRIES) {
          const delay = DELAYS_MS[attempt];
          logger.warn(
            `Failed to create folder ${folderName},
                retrying in ${delay}ms... (attempt ${attempt + 1}/${MAX_RETRIES + 1})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          logger.error(`Failed to create folder ${folderName} after ${MAX_RETRIES + 1} attempts`);
          throw error;
        }
      }
    }
    return null;
  }
}
