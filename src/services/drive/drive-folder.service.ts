import { FolderMeta } from '@internxt/sdk/dist/drive/storage/types';
import { DriveFileItem } from '../../types/drive.types';
import { SdkManager } from '../sdk-manager.service';
import { Storage } from '@internxt/sdk/dist/drive';

export class DriveFolderService {
  static readonly instance = new DriveFolderService();

  public getFolderMetaByUuid = async (uuid: string): Promise<FolderMeta> => {
    const storageClient = SdkManager.instance.getStorage();
    return await storageClient.getFolderMeta(uuid);
  };

  public getFolderMetaById = async (id: number): Promise<FolderMeta> => {
    const storageClient = SdkManager.instance.getStorage();
    return await storageClient.getFolderMetaById(id);
  };

  public getFolderContent = async (folderUuid: string) => {
    const storageClient = SdkManager.instance.getStorage();
    const folders = await this.getAllSubfolders(storageClient, folderUuid, 0, 50);
    const files = await this.getAllSubfiles(storageClient, folderUuid, 0, 50);
    return { folders, files };
  };

  private getAllSubfolders = async (storageClient: Storage, folderUuid: string, offset: number, limit = 50) => {
    const [folderContentPromise] = storageClient.getFolderFoldersByUuid(folderUuid, offset, limit, 'plainName', 'ASC');
    const { result } = await folderContentPromise;

    if (result.length > 0) {
      return result.concat(await this.getAllSubfolders(storageClient, folderUuid, offset + result.length, limit));
    } else {
      return result;
    }
  };

  private getAllSubfiles = async (storageClient: Storage, folderUuid: string, offset: number, limit = 50) => {
    const [folderContentPromise] = storageClient.getFolderFilesByUuid(folderUuid, offset, limit, 'plainName', 'ASC');
    const { result } = await folderContentPromise;

    if (result.length > 0) {
      return result.concat(await this.getAllSubfiles(storageClient, folderUuid, offset + result.length, limit));
    } else {
      return result;
    }
  };
}
