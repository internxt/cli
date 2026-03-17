import { Readable } from 'node:stream';
import { createReadStream } from 'node:fs';
import { DriveFileService } from './drive/drive-file.service';
import { StorageTypes } from '@internxt/sdk/dist/drive';
import { NetworkFacade } from './network/network-facade.service';
import { ThumbnailConfig, ThumbnailUtils } from '../utils/thumbnail.utils';
import { BufferStream } from '../utils/stream.utils';
import { ErrorUtils } from '../utils/errors.utils';
import { AsyncUtils } from '../utils/async.utils';

let sharpDependency: typeof import('sharp') | null = null;

const getSharp = async () => {
  if (!sharpDependency) {
    try {
      sharpDependency = (await import('sharp')).default;
    } catch {
      return null;
    }
  }
  return sharpDependency;
};

export class ThumbnailService {
  public static readonly instance: ThumbnailService = new ThumbnailService();
  private static readonly MAX_THUMBNAIL_TIMEOUT = 30000;

  public uploadThumbnail = async (
    fileContent: Buffer,
    fileType: string,
    userBucket: string,
    file_id: string,
    networkFacade: NetworkFacade,
    fileSize: number,
  ): Promise<StorageTypes.Thumbnail | undefined> => {
    let thumbnailBuffer: Buffer | undefined;
    if (ThumbnailUtils.isImageThumbnailable(fileType, fileSize)) {
      thumbnailBuffer = await this.getThumbnailFromImageBuffer(fileContent);
    }
    if (thumbnailBuffer) {
      const size = thumbnailBuffer.length;

      const fileId = await networkFacade.uploadFile({
        from: Readable.from(thumbnailBuffer),
        size: size,
        bucketId: userBucket,
        progressCallback: () => {},
      });

      const createdThumbnailFile = await DriveFileService.instance.createThumbnail({
        fileUuid: file_id,
        maxWidth: ThumbnailConfig.MaxWidth,
        maxHeight: ThumbnailConfig.MaxHeight,
        type: ThumbnailConfig.Type,
        size: size,
        bucketId: userBucket,
        bucketFile: fileId,
        encryptVersion: StorageTypes.EncryptionVersion.Aes03,
      });
      return createdThumbnailFile;
    }
  };

  private readonly getThumbnailFromImageBuffer = async (buffer: Buffer): Promise<Buffer | undefined> => {
    const sharp = await getSharp();
    if (sharp) {
      return sharp(buffer, { failOnError: false })
        .resize({
          height: ThumbnailConfig.MaxHeight,
          width: ThumbnailConfig.MaxWidth,
          fit: 'inside',
        })
        .png({
          quality: ThumbnailConfig.Quality,
        })
        .toBuffer();
    }
  };

  public tryUploadThumbnail = async ({
    bufferStream,
    fileType,
    bucket,
    fileUuid,
    networkFacade,
    size,
  }: {
    bufferStream?: BufferStream;
    fileType: string;
    bucket: string;
    fileUuid: string;
    networkFacade: NetworkFacade;
    size: number;
  }) => {
    try {
      const thumbnailBuffer = bufferStream?.getBuffer();
      if (thumbnailBuffer) {
        await AsyncUtils.withTimeout(
          ThumbnailService.instance.uploadThumbnail(thumbnailBuffer, fileType, bucket, fileUuid, networkFacade, size),
          ThumbnailService.MAX_THUMBNAIL_TIMEOUT,
          'Thumbnail upload timeout',
        );
      }
    } catch (error) {
      ErrorUtils.report(error);
    }
  };

  public createFileStreamWithBuffer = ({
    path,
    fileType,
  }: {
    path: string;
    fileType: string;
  }): {
    bufferStream?: BufferStream;
    fileStream: Readable;
  } => {
    const readable: Readable = createReadStream(path);
    if (ThumbnailUtils.isFileThumbnailable(fileType)) {
      const bufferStream = new BufferStream();
      return {
        bufferStream,
        fileStream: readable.pipe(bufferStream),
      };
    }
    return { fileStream: readable };
  };
}
