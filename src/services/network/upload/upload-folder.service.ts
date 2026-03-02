import { dirname } from 'node:path';
import { ErrorUtils } from '../../../utils/errors.utils';
import { logger } from '../../../utils/logger.utils';
import { DriveFolderService } from '../../drive/drive-folder.service';
import { CreateFoldersParams, CreateFolderWithRetryParams, DELAYS_MS, MAX_RETRIES } from './upload.types';
import { CLIUtils } from '../../../utils/cli.utils';

export class UploadFolderService {
  static readonly instance = new UploadFolderService();

  public createFolders = async ({
    foldersToCreate,
    destinationFolderUuid,
    currentProgress,
    emitProgress,
    debugMode,
    reporter,
  }: CreateFoldersParams): Promise<Map<string, string>> => {
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
        debugMode,
        reporter,
      });

      if (createdFolderUuid) {
        folderMap.set(folder.relativePath, createdFolderUuid);
        currentProgress.itemsUploaded++;
        emitProgress();
      }
    }
    return folderMap;
  };

  public createFolderWithRetry = async ({
    folderName,
    parentFolderUuid,
    debugMode,
    reporter,
  }: CreateFolderWithRetryParams): Promise<string | null> => {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const [createFolderPromise] = await DriveFolderService.instance.createFolder({
          plainName: folderName,
          parentFolderUuid,
        });

        const createdFolder = await createFolderPromise;
        return createdFolder.uuid;
      } catch (error: unknown) {
        if (ErrorUtils.isAlreadyExistsError(error)) {
          logger.warn(`Folder ${folderName} already exists, skipping...`);
          return null;
        }

        if (attempt < MAX_RETRIES) {
          const delay = DELAYS_MS[attempt];
          if (debugMode) {
            CLIUtils.warning(
              reporter,
              `Failed to create folder '${folderName}', retrying in ${delay}ms... ` +
                `(attempt ${attempt + 1}/${MAX_RETRIES + 1})`,
            );
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          CLIUtils.error(reporter, `Failed to create folder '${folderName}' after ${MAX_RETRIES + 1} attempts`);
          throw error;
        }
      }
    }
    return null;
  };
}
