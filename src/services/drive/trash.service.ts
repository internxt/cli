import { StorageTypes } from '@internxt/sdk/dist/drive';
import { SdkManager } from '../sdk-manager.service';

export class TrashService {
  static readonly instance = new TrashService();

  public trashItems = (payload: StorageTypes.AddItemsToTrashPayload) => {
    const storageClient = SdkManager.instance.getStorage(true);
    return storageClient.addItemsToTrash(payload);
  };
}
