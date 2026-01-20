import { Readable } from 'node:stream';
import { createReadStream } from 'node:fs';
import { DriveFileService } from './drive/drive-file.service';
import { StorageTypes } from '@internxt/sdk/dist/drive';
import { NetworkFacade } from './network/network-facade.service';
import { ThumbnailConfig, ThumbnailUtils } from '../utils/thumbnail.utils';
import { BufferStream } from '../utils/stream.utils';
import { ErrorUtils } from '../utils/errors.utils';

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

  public uploadThumbnail = async (
    fileContent: Buffer,
    fileType: string,
    userBucket: string,
    file_id: string,
    networkFacade: NetworkFacade,
  ): Promise<StorageTypes.Thumbnail | undefined> => {
    let thumbnailBuffer: Buffer | undefined;
    if (ThumbnailUtils.isImageThumbnailable(fileType)) {
      thumbnailBuffer = await this.getThumbnailFromImageBuffer(fileContent);
    }
    if (thumbnailBuffer) {
      const size = thumbnailBuffer.length;

      const fileId = await new Promise((resolve: (fileId: string) => void, reject) => {
        networkFacade.uploadFile(
          Readable.from(thumbnailBuffer),
          size,
          userBucket,
          (err: Error | null, res: string | null) => {
            if (err) {
              return reject(err);
            }
            resolve(res as string);
          },
          () => {},
        );
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
  }: {
    bufferStream?: BufferStream;
    fileType: string;
    bucket: string;
    fileUuid: string;
    networkFacade: NetworkFacade;
  }) => {
    try {
      const thumbnailBuffer = bufferStream?.getBuffer();
      if (thumbnailBuffer) {
        await ThumbnailService.instance.uploadThumbnail(thumbnailBuffer, fileType, bucket, fileUuid, networkFacade);
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
