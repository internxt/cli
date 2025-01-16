import { Readable } from 'node:stream';
import { DriveFileService } from './drive/drive-file.service';
import { StorageTypes } from '@internxt/sdk/dist/drive';
import { NetworkFacade } from './network/network-facade.service';
import { UploadService } from './network/upload.service';
import { isImageThumbnailable, ThumbnailConfig } from '../utils/thumbnail.utils';
import sharp from 'sharp';

export class ThumbnailService {
  public static readonly instance: ThumbnailService = new ThumbnailService();

  public uploadThumbnail = async (
    fileContent: Buffer,
    fileType: string,
    userBucket: string,
    userMnemonic: string,
    file_id: number,
    networkFacade: NetworkFacade,
  ): Promise<StorageTypes.Thumbnail | undefined> => {
    let thumbnailBuffer: Buffer | undefined;
    if (isImageThumbnailable(fileType)) {
      thumbnailBuffer = await this.getThumbnailFromImageBuffer(fileContent);
    }
    if (thumbnailBuffer) {
      const size = thumbnailBuffer.length;
      const [thumbnailPromise] = await UploadService.instance.uploadFileStream(
        Readable.from(thumbnailBuffer),
        userBucket,
        userMnemonic,
        size,
        networkFacade,
        () => {},
      );

      const thumbnailUploadResult = await thumbnailPromise;

      const createdThumbnailFile = await DriveFileService.instance.createThumbnail({
        file_id: file_id,
        max_width: ThumbnailConfig.MaxWidth,
        max_height: ThumbnailConfig.MaxHeight,
        type: ThumbnailConfig.Type,
        size: size,
        bucket_id: userBucket,
        bucket_file: thumbnailUploadResult.fileId,
        encrypt_version: StorageTypes.EncryptionVersion.Aes03,
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
