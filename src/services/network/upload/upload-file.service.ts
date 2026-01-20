import { logger } from '../../../utils/logger.utils';
import {
  DELAYS_MS,
  MAX_CONCURRENT_UPLOADS,
  MAX_RETRIES,
  UploadFilesConcurrentlyParams,
  UploadFileWithRetryParams,
} from './upload.types';
import { DriveFileService } from '../../drive/drive-file.service';
import { dirname, extname } from 'node:path';
import { ErrorUtils } from '../../../utils/errors.utils';
import { stat } from 'node:fs/promises';
import { EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import { BufferStream } from '../../../utils/stream.utils';
import { DriveFileItem } from '../../../types/drive.types';
import { CLIUtils } from '../../../utils/cli.utils';
import { ThumbnailService } from '../../thumbnail.service';

export class UploadFileService {
  static readonly instance = new UploadFileService();

  public uploadFilesConcurrently = async ({
    network,
    filesToUpload,
    folderMap,
    bucket,
    destinationFolderUuid,
    currentProgress,
    emitProgress,
  }: UploadFilesConcurrentlyParams): Promise<number> => {
    let bytesUploaded = 0;

    const concurrentFiles = this.concurrencyArray(filesToUpload, MAX_CONCURRENT_UPLOADS);

    for (const fileArray of concurrentFiles) {
      await Promise.allSettled(
        fileArray.map(async (file) => {
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
  };

  public uploadFileWithRetry = async ({
    file,
    network,
    bucket,
    parentFolderUuid,
  }: UploadFileWithRetryParams): Promise<DriveFileItem | null> => {
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const stats = await stat(file.absolutePath);
        const fileSize = stats.size ?? 0;

        const fileType = extname(file.absolutePath).replaceAll('.', '');

        let fileId: string | undefined;
        let thumbnailStream: BufferStream | undefined;

        const timings = {
          networkUpload: 0,
          driveUpload: 0,
          thumbnailUpload: 0,
        };

        if (fileSize > 0) {
          const { fileStream, bufferStream } = ThumbnailService.instance.createFileStreamWithBuffer({
            path: file.absolutePath,
            fileType,
          });

          const uploadTimer = CLIUtils.timer();
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
          timings.networkUpload = uploadTimer.stop();
        }

        const driveTimer = CLIUtils.timer();
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
        timings.driveUpload = driveTimer.stop();

        const thumbnailTimer = CLIUtils.timer();
        if (thumbnailStream && fileSize > 0) {
          void ThumbnailService.instance.tryUploadThumbnail({
            bufferStream: thumbnailStream,
            fileType,
            bucket,
            fileUuid: createdDriveFile.uuid,
            networkFacade: network,
          });
        }
        timings.thumbnailUpload = thumbnailTimer.stop();

        const totalTime = Object.values(timings).reduce((sum, time) => sum + time, 0);
        const throughputMBps = CLIUtils.calculateThroughputMBps(stats.size, timings.networkUpload);
        logger.info(`Uploaded '${file.name}' (${CLIUtils.formatBytesToString(stats.size)})`);
        logger.info(
          'Timing breakdown:\n' +
            `Network upload: ${CLIUtils.formatDuration(timings.networkUpload)} (${throughputMBps.toFixed(2)} MB/s)\n` +
            `Drive upload: ${CLIUtils.formatDuration(timings.driveUpload)}\n` +
            `Thumbnail: ${CLIUtils.formatDuration(timings.thumbnailUpload)}\n` +
            `Total: ${CLIUtils.formatDuration(totalTime)}\n`,
        );

        return createdDriveFile;
      } catch (error: unknown) {
        if (ErrorUtils.isAlreadyExistsError(error)) {
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
  };

  private concurrencyArray = <T>(array: T[], arraySize: number): T[][] => {
    const arrays: T[][] = [];
    for (let i = 0; i < array.length; i += arraySize) {
      arrays.push(array.slice(i, i + arraySize));
    }
    return arrays;
  };
}
