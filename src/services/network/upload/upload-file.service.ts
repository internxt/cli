import { logger } from '../../../utils/logger.utils';
import {
  DELAYS_MS,
  MAX_CONCURRENT_UPLOADS,
  MAX_RETRIES,
  UploadFilesInBatchesParams,
  UploadFileWithRetryParams,
} from './upload.types';
import { DriveFileService } from '../../drive/drive-file.service';
import { dirname, extname } from 'node:path';
import { isAlreadyExistsError } from '../../../utils/errors.utils';
import { stat } from 'node:fs/promises';
import { EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import { createFileStreamWithBuffer, tryUploadThumbnail } from '../../../utils/thumbnail.utils';
import { BufferStream } from '../../../utils/stream.utils';
import { DriveFileItem } from '../../../types/drive.types';

export class UploadFileService {
  static readonly instance = new UploadFileService();

  async uploadFilesInChunks({
    network,
    filesToUpload,
    folderMap,
    bucket,
    destinationFolderUuid,
    currentProgress,
    emitProgress,
  }: UploadFilesInBatchesParams): Promise<number> {
    let bytesUploaded = 0;

    const chunks = this.chunkArray(filesToUpload, MAX_CONCURRENT_UPLOADS);

    for (const chunk of chunks) {
      await Promise.allSettled(
        chunk.map(async (file) => {
          const parentPath = dirname(file.relativePath);
          const parentFolderUuid =
            parentPath === '.' || parentPath === '' ? destinationFolderUuid : folderMap.get(parentPath);

          if (!parentFolderUuid) {
            logger.warn(`Parent folder not found for ${file.relativePath}, skipping...`);
            return null;
          }
          const createdFileUuid = await this.uploadFileWithRetry({
            file,
            network,
            bucket,
            parentFolderUuid,
          });
          if (createdFileUuid) {
            bytesUploaded += file.size;
            currentProgress.bytesUploaded += file.size;
            currentProgress.itemsUploaded++;
          }
          emitProgress();
        }),
      );
    }
    return bytesUploaded;
  }

  async uploadFileWithRetry({
    file,
    network,
    bucket,
    parentFolderUuid,
  }: UploadFileWithRetryParams): Promise<DriveFileItem | null> {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const stats = await stat(file.absolutePath);
        const fileSize = stats.size ?? 0;

        const fileType = extname(file.absolutePath).replaceAll('.', '');

        let fileId: string | undefined;
        let thumbnailStream: BufferStream | undefined;

        if (fileSize > 0) {
          const { fileStream, bufferStream } = createFileStreamWithBuffer({
            path: file.absolutePath,
            fileType,
          });

          thumbnailStream = bufferStream;

          fileId = await new Promise<string>((resolve, reject) => {
            network.uploadFile(
              fileStream,
              fileSize,
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
        }

        const createdDriveFile = await DriveFileService.instance.createFile({
          plainName: file.name,
          type: fileType,
          size: fileSize,
          folderUuid: parentFolderUuid,
          fileId,
          bucket,
          encryptVersion: EncryptionVersion.Aes03,
          creationTime: stats.birthtime?.toISOString(),
          modificationTime: stats.mtime?.toISOString(),
        });

        if (thumbnailStream && fileSize > 0) {
          await tryUploadThumbnail({
            bufferStream: thumbnailStream,
            fileType,
            userBucket: bucket,
            fileUuid: createdDriveFile.uuid,
            networkFacade: network,
          });
        }

        return createdDriveFile;
      } catch (error: unknown) {
        if (isAlreadyExistsError(error)) {
          const msg = `File ${file.name} already exists, skipping...`;
          logger.info(msg);
          return null;
        }

        if (attempt < MAX_RETRIES) {
          const delay = DELAYS_MS[attempt];
          const retryMsg = `Failed to upload file ${file.name}, retrying in ${delay}ms...`;
          logger.warn(`${retryMsg} (attempt ${attempt + 1}/${MAX_RETRIES + 1})`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else {
          logger.error(`Failed to upload file ${file.name} after ${MAX_RETRIES + 1} attempts`);
          return null;
        }
      }
    }
    return null;
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }
}
