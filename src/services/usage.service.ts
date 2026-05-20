import { SdkManager } from './sdk-manager.service';
import { CacheService } from './cache.service';
import { StorageTypes } from '@internxt/sdk/dist/drive/storage';

export class UsageService {
  public static readonly instance: UsageService = new UsageService();
  public static readonly INFINITE_LIMIT = 99 * Math.pow(1024, 4);
  private static readonly FETCH_LIMITS_CACHE_KEY = 'usage:fetchLimits';

  public fetchUsage = async (): Promise<number> => {
    const storageClient = SdkManager.instance.getStorage();
    const driveUsage = await storageClient.spaceUsageV2();

    return driveUsage.total;
  };

  public fetchSpaceLimit = async (): Promise<number> => {
    const storageClient = SdkManager.instance.getStorage();
    const spaceLimit = await storageClient.spaceLimitV2();
    return spaceLimit.maxSpaceBytes;
  };

  public fetchLimits = async (): Promise<StorageTypes.FileLimitsResponse> => {
    const cached = CacheService.instance.get<StorageTypes.FileLimitsResponse>(UsageService.FETCH_LIMITS_CACHE_KEY);
    if (cached !== null && typeof cached === 'object' && 'maxUploadFileSize' in cached) return cached;

    const storageClient = SdkManager.instance.getStorage();
    const limits = await storageClient.getFileVersionLimits();

    CacheService.instance.set(UsageService.FETCH_LIMITS_CACHE_KEY, limits);
    return limits;
  };
}
