import { SdkManager } from './sdk-manager.service';

export class UsageService {
  public static readonly instance: UsageService = new UsageService();
  public static readonly INFINITE_LIMIT = 108851651149824;

  public fetchTotalUsage = async (): Promise<number> => {
    const storageClient = SdkManager.instance.getStorage();
    const photosClient = SdkManager.instance.getPhotos();

    const [driveUsage, { usage: photosUsage }] = await Promise.all([
      storageClient.spaceUsage(),
      photosClient.photos.getUsage(),
    ]);

    return driveUsage.total + photosUsage;
  };

  public fetchSpaceLimit = async (): Promise<number> => {
    const storageClient = SdkManager.instance.getStorage();
    const spaceLimit = await storageClient.spaceLimit();
    return spaceLimit.maxSpaceBytes;
  };
}
