import { StorageTypes } from '@internxt/sdk/dist/drive';
import { SdkManager } from '../sdk-manager.service';
import { FetchPaginatedFile, FetchPaginatedFolder } from '@internxt/sdk/dist/drive/storage/types';

export class TrashService {
  static readonly instance = new TrashService();

  public trashItems = (payload: StorageTypes.AddItemsToTrashPayload) => {
    const storageClient = SdkManager.instance.getStorage();
    return storageClient.addItemsToTrash(payload);
  };

  public deleteItemPermanently = (itemType: 'file' | 'folder', id: string) => {
    if (itemType === 'file') {
      return this.deleteFile(id);
    } else {
      return this.deleteFolder(id);
    }
  };

  public deleteFile = (fileId: string) => {
    const storageClient = SdkManager.instance.getStorage();
    return storageClient.deleteFileByUuid(fileId);
  };

  public deleteFolder = (folderId: string) => {
    const storageClient = SdkManager.instance.getStorage();
    return storageClient.deleteFolderByUuid(folderId);
  };

  public clearTrash = async () => {
    const trashClient = SdkManager.instance.getTrash();
    return trashClient.clearTrash();
  };

  public getTrashFolderContent = async () => {
    const folders = await this.getAllTrashSubfolders(0);
    const files = await this.getAllTrashSubfiles(0);
    return { folders, files };
  };

  private readonly getAllTrashSubfolders = async (offset: number): Promise<FetchPaginatedFolder[]> => {
    const trashClient = SdkManager.instance.getTrash();
    const promise = trashClient.getTrashedFilesPaginated(50, offset, 'folders', true);
    const folders = (await promise).result as unknown as FetchPaginatedFolder[];

    if (folders.length > 0) {
      return folders.concat(await this.getAllTrashSubfolders(offset + folders.length));
    } else {
      return folders;
    }
  };

  private readonly getAllTrashSubfiles = async (offset: number): Promise<FetchPaginatedFile[]> => {
    const trashClient = SdkManager.instance.getTrash();
    const promise = trashClient.getTrashedFilesPaginated(50, offset, 'files', true);
    const files = (await promise).result as unknown as FetchPaginatedFile[];

    if (files.length > 0) {
      return files.concat(await this.getAllTrashSubfiles(offset + files.length));
    } else {
      return files;
    }
  };
}
