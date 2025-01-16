import { Readable } from 'node:stream';
import { DriveFileService } from './drive/drive-file.service';
import { StorageTypes } from '@internxt/sdk/dist/drive';
import { NetworkFacade } from './network/network-facade.service';
import { UploadService } from './network/upload.service';

export class ThumbnailService {
  public static readonly instance: ThumbnailService = new ThumbnailService();

  public static readonly MaxWidth = 300;
  public static readonly MaxHeight = 300;
  public static readonly Quality = 80;
  public static readonly Type = 'png';

  public uploadThumbnail = async (
    fileContent: Buffer,
    userBucket: string,
    userMnemonic: string,
    file_id: number,
    networkFacade: NetworkFacade,
  ): Promise<StorageTypes.Thumbnail> => {
    const size = fileContent.length;
    const [thumbnailPromise] = await UploadService.instance.uploadFileStream(
      Readable.from(fileContent),
      userBucket,
      userMnemonic,
      size,
      networkFacade,
      () => {},
    );

    const thumbnailUploadResult = await thumbnailPromise;

    const createdThumbnailFile = await DriveFileService.instance.createThumbnail({
      file_id: file_id,
      max_width: ThumbnailService.MaxWidth,
      max_height: ThumbnailService.MaxHeight,
      type: ThumbnailService.Type,
      size: size,
      bucket_id: userBucket,
      bucket_file: thumbnailUploadResult.fileId,
      encrypt_version: StorageTypes.EncryptionVersion.Aes03,
    });
    return createdThumbnailFile;
  };
}
