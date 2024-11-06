import { UsageResponse } from '@internxt/sdk/dist/drive/storage/types';
import { SdkManager } from './sdk-manager.service';

export class UsageService {
  public static readonly instance: UsageService = new UsageService();
  public static readonly INFINITE_LIMIT = 99 * Math.pow(1024, 4);

  public fetchUsage = async (): Promise<UsageResponse> => {
    const storageClient = SdkManager.instance.getStorage();
    const driveUsage = await storageClient.spaceUsage();

    return driveUsage;
  };

  public fetchSpaceLimit = async (): Promise<number> => {
    const storageClient = SdkManager.instance.getStorage();
    const spaceLimit = await storageClient.spaceLimit();
    return spaceLimit.maxSpaceBytes;
  };
}
