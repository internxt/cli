import { UsageResponseV2 } from '@internxt/sdk/dist/drive/storage/types';
import { SdkManager } from './sdk-manager.service';

export class UsageService {
  public static readonly instance: UsageService = new UsageService();
  public static readonly INFINITE_LIMIT = 99 * Math.pow(1024, 4);

  public fetchUsage = async (): Promise<UsageResponseV2> => {
    const storageClient = SdkManager.instance.getStorage();
    const driveUsage = await storageClient.spaceUsageV2();

    return driveUsage;
  };

  public fetchSpaceLimit = async (): Promise<number> => {
    const storageClient = SdkManager.instance.getStorage();
    const spaceLimit = await storageClient.spaceLimitV2();
    return spaceLimit.maxSpaceBytes;
  };
}
