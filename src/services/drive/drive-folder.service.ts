import { FetchPaginatedFile, FetchPaginatedFolder } from '@internxt/sdk/dist/drive/storage/types';
import { SdkManager } from '../sdk-manager.service';
import { Storage, StorageTypes } from '@internxt/sdk/dist/drive';
import { DriveFolderItem } from '../../types/drive.types';
import { DriveUtils } from '../../utils/drive.utils';
import { RequestCanceler } from '@internxt/sdk/dist/shared/http/types';

export class DriveFolderService {
  static readonly instance = new DriveFolderService();

  public getFolderMetaByUuid = async (uuid: string): Promise<DriveFolderItem> => {
    const storageClient = SdkManager.instance.getStorage();
    const folderMeta = await storageClient.getFolderMeta(uuid);
    return DriveUtils.driveFolderMetaToItem(folderMeta);
  };

  public getFolderMetaById = async (id: number): Promise<DriveFolderItem> => {
    const storageClient = SdkManager.instance.getStorage();
    const folderMeta = await storageClient.getFolderMetaById(id);
    return DriveUtils.driveFolderMetaToItem(folderMeta);
  };

  public getFolderContent = async (folderUuid: string) => {
    const storageClient = SdkManager.instance.getStorage();
    const folders = await this.getAllSubfolders(storageClient, folderUuid, 0);
    const files = await this.getAllSubfiles(storageClient, folderUuid, 0);
    return { folders, files };
  };

  private readonly getAllSubfolders = async (
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

  private readonly getAllSubfiles = async (
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

  public moveFolder = (uuid: string, payload: StorageTypes.MoveFolderUuidPayload): Promise<StorageTypes.FolderMeta> => {
    const storageClient = SdkManager.instance.getStorage();
    return storageClient.moveFolderByUuid(uuid, payload);
  };

  /**
   * Creates a new folder in Drive with the given folder name and parent folder UUID.
   *
   * @param {Object} payload - The payload object containing the folder name and parent folder UUID.
   * @param {string} payload.folderName - The name of the folder to be created.
   * @param {number} payload.parentFolderId - The ID of the parent folder.
   * @return {[Promise<StorageTypes.CreateFolderResponse>, RequestCanceler]} - A tuple containing a promise that resolves to the response of creating the folder and a request canceler.
   */
  public createFolder(
    payload: StorageTypes.CreateFolderByUuidPayload,
  ): [Promise<StorageTypes.CreateFolderResponse>, RequestCanceler] {
    const storageClient = SdkManager.instance.getStorage();
    return storageClient.createFolderByUuid(payload);
  }

  public renameFolder = (payload: { folderUuid: string; name: string }): Promise<void> => {
    const storageClient = SdkManager.instance.getStorage();
    return storageClient.updateFolderNameWithUUID(payload);
  };

  public getFolderMetadataByPath = async (path: string): Promise<DriveFolderItem> => {
    const storageClient = SdkManager.instance.getStorage();
    const folderMeta = await storageClient.getFolderByPath(encodeURIComponent(path));
    return DriveUtils.driveFolderMetaToItem({
      ...folderMeta,
      createdAt: folderMeta.createdAt ?? folderMeta.created_at,
      updatedAt: folderMeta.updatedAt ?? folderMeta.updated_at,
      plainName: folderMeta.plainName ?? folderMeta.plain_name,
      parentId: folderMeta.parentId ?? folderMeta.parent_id,
      parentUuid: folderMeta.parentUuid ?? folderMeta.parent_uuid,
    });
  };
}
