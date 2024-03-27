import { FetchPaginatedFile, FetchPaginatedFolder } from '@internxt/sdk/dist/drive/storage/types';
import { SdkManager } from '../sdk-manager.service';
import { Storage, StorageTypes } from '@internxt/sdk/dist/drive';
import { DriveFolderItem } from '../../types/drive.types';
import { DriveUtils } from '../../utils/drive.utils';

export class DriveFolderService {
  static readonly instance = new DriveFolderService();

  public getFolderMetaByUuid = async (uuid: string): Promise<DriveFolderItem> => {
    const storageClient = SdkManager.instance.getStorage(true);
    const folderMeta = await storageClient.getFolderMeta(uuid);
    return DriveUtils.driveFolderMetaToItem(folderMeta);
  };

  public getFolderMetaById = async (id: number): Promise<DriveFolderItem> => {
    const storageClient = SdkManager.instance.getStorage(true);
    const folderMeta = await storageClient.getFolderMetaById(id);
    return DriveUtils.driveFolderMetaToItem(folderMeta);
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

  public moveFolder = (payload: StorageTypes.MoveFolderUuidPayload): Promise<StorageTypes.FolderMeta> => {
    const storageClient = SdkManager.instance.getStorage(true);
    return storageClient.moveFolderByUuid(payload);
  };
}
