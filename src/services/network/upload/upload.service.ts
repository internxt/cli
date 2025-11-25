import { logger } from '../../../utils/logger.utils';
import {
  CreateFoldersParams,
  CreateFolderWithRetryParams,
  UploadFilesInBatchesParams,
  UploadFileWithRetryParams,
} from './upload.types';
import { DriveFolderService } from '../../drive/drive-folder.service';
import { DriveFileService } from '../../drive/drive-file.service';
import { ThumbnailService } from '../../thumbnail.service';
import { dirname, extname } from 'node:path';
import { isAlreadyExistsError, ErrorUtils } from '../../../utils/errors.utils';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import { BufferStream } from '../../../utils/stream.utils';
import { isFileThumbnailable } from '../../../utils/thumbnail.utils';
import { Readable } from 'node:stream';

export class UploadService {
  static readonly instance = new UploadService();
  MAX_CONCURRENT_UPLOADS = 5;
  DELAYS_MS = [500, 1000, 2000];
  MAX_RETRIES = 3;

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
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const [createFolderPromise] = DriveFolderService.instance.createFolder({
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
        if (attempt < this.MAX_RETRIES - 1) {
          const delay = this.DELAYS_MS[attempt];
          logger.warn(
            `Failed to create folder ${folderName}, 
            retrying in ${delay}ms... (attempt ${attempt + 1}/${this.MAX_RETRIES})`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          logger.error(`Failed to create folder ${folderName} after ${this.MAX_RETRIES} attempts: ${error}`);
          throw error;
        }
      }
    }
    return null;
  }

  async uploadFilesInBatches({
    network,
    filesToUpload,
    folderMap,
    bucket,
    destinationFolderUuid,
    currentProgress,
    emitProgress,
  }: UploadFilesInBatchesParams): Promise<number> {
    let bytesUploaded = 0;

    for (let i = 0; i < filesToUpload.length; i += this.MAX_CONCURRENT_UPLOADS) {
      const batch = filesToUpload.slice(i, i + this.MAX_CONCURRENT_UPLOADS);

      await Promise.allSettled(
        batch.map(async (file) => {
          try {
            const createdFileUuid = await this.uploadFileWithRetry({
              file,
              folderMap,
              network,
              bucket,
              destinationFolderUuid,
            });
            if (createdFileUuid) {
              bytesUploaded += file.size;
              currentProgress.bytesUploaded += file.size;
            }
          } catch (error) {
            logger.error(`Failed to upload file ${file.relativePath}: ${error}`);
          } finally {
            currentProgress.itemsUploaded++;
            emitProgress();
          }
        }),
      );
    }

    return bytesUploaded;
  }

  async uploadFileWithRetry({
    file,
    folderMap,
    network,
    bucket,
    destinationFolderUuid,
  }: UploadFileWithRetryParams): Promise<string | null> {
    for (let attempt = 0; attempt < this.MAX_RETRIES; attempt++) {
      try {
        const parentRelativePath = dirname(file.relativePath);
        const parentUuid =
          parentRelativePath === '.' || parentRelativePath === ''
            ? destinationFolderUuid
            : folderMap.get(parentRelativePath);

        if (!parentUuid) {
          logger.warn(`Parent folder not found for ${file.relativePath}, skipping...`);
          return null;
        }

        const stats = await stat(file.absolutePath);
        if (!stats.size) {
          logger.warn(`Skipping empty file: ${file.relativePath}`);
          return null;
        }

        const fileType = extname(file.absolutePath).replaceAll('.', '');

        let bufferStream: BufferStream | undefined;
        let fileStream: Readable = createReadStream(file.absolutePath);
        const isThumbnailable = isFileThumbnailable(fileType);

        if (isThumbnailable) {
          bufferStream = new BufferStream();
          fileStream = fileStream.pipe(bufferStream);
        }

        const fileId = await new Promise<string>((resolve, reject) => {
          network.uploadFile(
            fileStream,
            stats.size,
            bucket,
            (err: Error | null, res: string | null) => {
              if (err) {
                return reject(err);
              }
              resolve(res as string);
            },
            () => {},
          );
        });

        const createdDriveFile = await DriveFileService.instance.createFile({
          plainName: file.name,
          type: fileType,
          size: stats.size,
          folderUuid: parentUuid,
          fileId,
          bucket,
          encryptVersion: EncryptionVersion.Aes03,
          creationTime: stats.birthtime?.toISOString(),
          modificationTime: stats.mtime?.toISOString(),
        });

        try {
          if (isThumbnailable && bufferStream) {
            const thumbnailBuffer = bufferStream.getBuffer();

            if (thumbnailBuffer) {
              await ThumbnailService.instance.uploadThumbnail(
                thumbnailBuffer,
                fileType,
                bucket,
                createdDriveFile.uuid,
                network,
              );
            }
          }
        } catch (error) {
          ErrorUtils.report(error);
        }

        return createdDriveFile.fileId;
      } catch (error: unknown) {
        if (isAlreadyExistsError(error)) {
          const msg = `File ${file.name} already exists, skipping...`;
          logger.info(msg);
          return null;
        }

        if (attempt < this.MAX_RETRIES - 1) {
          const delay = this.DELAYS_MS[attempt];
          const retryMsg = `Failed to upload file ${file.name}, retrying in ${delay}ms...`;
          logger.warn(`${retryMsg} (attempt ${attempt + 1}/${this.MAX_RETRIES})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          logger.error(`Failed to upload file ${file.name} after ${this.MAX_RETRIES} attempts`);
          return null;
        }
      }
    }
    return null;
  }
}
