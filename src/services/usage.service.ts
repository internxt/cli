import { UsageResponse } from '@internxt/sdk/dist/drive/storage/types';
import { SdkManager } from './sdk-manager.service';
import { FormatUtils } from '../utils/format.utils';

export class UsageService {
  public static readonly instance: UsageService = new UsageService();
  public static readonly INFINITE_LIMIT = 108851651149824;

  public fetchUsage = async (): Promise<UsageResponse> => {
    const storageClient = SdkManager.instance.getStorage();
    const photosClient = SdkManager.instance.getPhotos();

    const [driveUsage, { usage: photosUsage }] = await Promise.all([
      storageClient.spaceUsage(),
      photosClient.photos.getUsage(),
    ]);

    driveUsage.total += photosUsage;

    return driveUsage;
  };

  public fetchLimit = async (): Promise<number> => {
    const storageClient = SdkManager.instance.getStorage();
    return storageClient.spaceLimit().then((response) => {
      return response.maxSpaceBytes;
    });
  };

  public formatLimit = (limit: number): string => {
    let result = '...';
    if (limit > 0) {
      result = limit === UsageService.INFINITE_LIMIT ? 'infinity' : FormatUtils.humanFileSize(limit);
    }
    return result;
  };
}
