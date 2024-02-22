import { FetchFolderContentResponse } from '@internxt/sdk/dist/drive/storage/types';
import { SdkManager } from '../sdk-manager.service';

export class DriveService {
  static readonly instance = new DriveService();

  public getFolderContent(folderId: number): Promise<FetchFolderContentResponse> {
    const storageClient = SdkManager.instance.getStorage();

    const [folderContentPromise] = storageClient.getFolderContent(folderId);

    return folderContentPromise;
  }
}
