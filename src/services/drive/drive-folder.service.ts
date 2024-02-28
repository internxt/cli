import { FetchPaginatedFile, FetchPaginatedFolder, FolderMeta } from '@internxt/sdk/dist/drive/storage/types';
import { SdkManager } from '../sdk-manager.service';
import { Storage } from '@internxt/sdk/dist/drive';

export class DriveFolderService {
  static readonly instance = new DriveFolderService();

  public getFolderMetaByUuid = async (uuid: string): Promise<FolderMeta> => {
    const storageClient = SdkManager.instance.getStorage(true);
    return await storageClient.getFolderMeta(uuid);
  };

  public getFolderMetaById = async (id: number): Promise<FolderMeta> => {
    const storageClient = SdkManager.instance.getStorage(true);
    return await storageClient.getFolderMetaById(id);
  };

  public getFolderContent = async (folderUuid: string) => {
    const storageClient = SdkManager.instance.getStorage(true);
    const folders = await this.getAllSubfolders(storageClient, folderUuid, 0);
    const files = await this.getAllSubfiles(storageClient, folderUuid, 0);
    return { folders, files };
  };

  private getAllSubfolders = async (
    storageClient: Storage,
    folderUuid: string,
    offset: number,
  ): Promise<FetchPaginatedFolder[]> => {
    const [folderContentPromise] = storageClient.getFolderFoldersByUuid(folderUuid, offset, 50, 'plainName', 'ASC');
    const { folders } = await folderContentPromise;

    if (folders.length > 0) {
      return folders.concat(await this.getAllSubfolders(storageClient, folderUuid, offset + folders.length));
    } else {
      return folders;
    }
  };

  private getAllSubfiles = async (
    storageClient: Storage,
    folderUuid: string,
    offset: number,
  ): Promise<FetchPaginatedFile[]> => {
    const [folderContentPromise] = storageClient.getFolderFilesByUuid(folderUuid, offset, 50, 'plainName', 'ASC');
    const { files } = await folderContentPromise;

    if (files.length > 0) {
      return files.concat(await this.getAllSubfiles(storageClient, folderUuid, offset + files.length));
    } else {
      return files;
    }
  };
}
