import { Readable } from 'node:stream';
import { DriveFileService } from './drive/drive-file.service';
import { StorageTypes } from '@internxt/sdk/dist/drive';
import { NetworkFacade } from './network/network-facade.service';
import { isImageThumbnailable, ThumbnailConfig } from '../utils/thumbnail.utils';
import sharp from 'sharp';

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
    if (isImageThumbnailable(fileType)) {
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

  private getThumbnailFromImageBuffer = (buffer: Buffer): Promise<Buffer> => {
    return sharp(buffer)
      .resize({
        height: ThumbnailConfig.MaxHeight,
        width: ThumbnailConfig.MaxWidth,
        fit: 'inside',
      })
      .png({
        quality: ThumbnailConfig.Quality,
      })
      .toBuffer();
  };
}
