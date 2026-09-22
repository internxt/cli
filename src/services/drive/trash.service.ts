import { StorageTypes } from '@internxt/sdk/dist/drive';
import { SdkManager } from '../sdk-manager.service';
import {
  FetchFilesSyncResponse,
  FetchFoldersSyncResponse,
  FilesSyncQuery,
  FoldersSyncQuery,
} from '@internxt/sdk/dist/drive/storage/types';
import { PaginationUtils } from '../../utils/pagination.utils';

type TrashedFolder = FetchFoldersSyncResponse['folders'][number];
type TrashedFile = FetchFilesSyncResponse['files'][number];

export class TrashService {
  static readonly instance = new TrashService();
  private static readonly SCAN_FROM = new Date(0).toISOString();

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
    const [folders, files] = await Promise.all([this.getTrashedFolders(), this.getTrashedFiles()]);
    return { folders, files };
  };

  private readonly getTrashedFolders = async (): Promise<TrashedFolder[]> => {
    const storageClient = SdkManager.instance.getStorage();
    return PaginationUtils.fetchAllPages(async (cursor) => {
      const [promise] = storageClient.getFoldersSync(this.syncQuery(cursor));
      const { folders, nextCursor } = await promise;
      return { items: folders, nextCursor };
    });
  };

  private readonly getTrashedFiles = async (): Promise<TrashedFile[]> => {
    const storageClient = SdkManager.instance.getStorage();
    return PaginationUtils.fetchAllPages(async (cursor) => {
      const [promise] = storageClient.getFilesSync(this.syncQuery(cursor));
      const { files, nextCursor } = await promise;
      return { items: files, nextCursor };
    });
  };

  private readonly syncQuery = (cursor?: string): FilesSyncQuery & FoldersSyncQuery => {
    const position = cursor ? { cursor } : { updatedAt: TrashService.SCAN_FROM };
    return { ...position, status: 'TRASHED', limit: PaginationUtils.MAX_PAGE_SIZE };
  };
}
