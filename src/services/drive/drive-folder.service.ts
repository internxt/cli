import {
  FetchFolderFilesCursorResponse,
  FetchFolderFoldersCursorResponse,
  FileStatus,
} from '@internxt/sdk/dist/drive/storage/types';
import { SdkManager } from '../sdk-manager.service';
import { StorageTypes } from '@internxt/sdk/dist/drive';
import { DriveFolderItem } from '../../types/drive.types';
import { DriveUtils } from '../../utils/drive.utils';
import { RequestCanceler } from '@internxt/sdk/dist/shared/http/types';
import { NotFoundError } from '../../utils/errors.utils';
import { PaginationUtils } from '../../utils/pagination.utils';

type FolderContentFolder = FetchFolderFoldersCursorResponse['folders'][number];
type FolderContentFile = FetchFolderFilesCursorResponse['files'][number];

export class DriveFolderService {
  static readonly instance = new DriveFolderService();

  public getFolderMetaByUuid = async (uuid: string): Promise<DriveFolderItem> => {
    const storageClient = SdkManager.instance.getStorage();
    const folderMeta = await storageClient.getFolderMeta(uuid);
    const folderItem = DriveUtils.driveFolderMetaToItem(folderMeta);
    if (folderItem.status !== FileStatus.EXISTS) {
      throw new NotFoundError(`Folder with uuid ${uuid} not found`);
    }
    return folderItem;
  };

  public getFolderMetaById = async (id: number): Promise<DriveFolderItem> => {
    const storageClient = SdkManager.instance.getStorage();
    const folderMeta = await storageClient.getFolderMetaById(id);
    const folderItem = DriveUtils.driveFolderMetaToItem(folderMeta);
    return folderItem;
  };

  public getFolderMetaByPath = async (path: string): Promise<DriveFolderItem> => {
    const storageClient = SdkManager.instance.getStorage();
    const folderMeta = await storageClient.getFolderByPath(path);
    const folderItem = DriveUtils.driveFolderMetaToItem(folderMeta);
    if (folderItem.status !== FileStatus.EXISTS) {
      throw new NotFoundError(`Folder with uuid ${folderItem.uuid} not found at path: ${path}`);
    }
    return folderItem;
  };

  public getFolderContent = async (folderUuid: string) => {
    const [folders, files] = await Promise.all([
      this.getFolderSubfolders(folderUuid),
      this.getFolderSubfiles(folderUuid),
    ]);
    return { folders, files };
  };

  public getFolderSubfolders = (folderUuid: string): Promise<FolderContentFolder[]> => {
    const storageClient = SdkManager.instance.getStorage();
    return PaginationUtils.fetchAllPages(async (cursor) => {
      const [promise] = storageClient.getFolderFoldersByUuidWithCursor(folderUuid, {
        limit: PaginationUtils.MAX_PAGE_SIZE,
        order: 'ASC',
        cursor,
      });
      const { folders, nextCursor } = await promise;
      return { items: folders, nextCursor };
    });
  };

  public getFolderSubfiles = (folderUuid: string): Promise<FolderContentFile[]> => {
    const storageClient = SdkManager.instance.getStorage();
    return PaginationUtils.fetchAllPages(async (cursor) => {
      const [promise] = storageClient.getFolderFilesByUuidWithCursor(folderUuid, {
        limit: PaginationUtils.MAX_PAGE_SIZE,
        order: 'ASC',
        cursor,
      });
      const { files, nextCursor } = await promise;
      return { items: files, nextCursor };
    });
  };

  public moveFolder = async (
    uuid: string,
    payload: StorageTypes.MoveFolderUuidPayload,
  ): Promise<StorageTypes.FolderMeta> => {
    const storageClient = SdkManager.instance.getStorage();
    const folderMeta = await storageClient.moveFolderByUuid(uuid, payload);
    return folderMeta;
  };

  /**
   * Creates a new folder in Drive with the given folder name and parent folder UUID.
   *
   * @param {Object} payload - The payload object containing the folder name and parent folder UUID.
   * @param {string} payload.folderName - The name of the folder to be created.
   * @param {number} payload.parentFolderId - The ID of the parent folder.
   * @return {[Promise<StorageTypes.CreateFolderResponse>, RequestCanceler]} - A tuple containing a promise that resolves to the response of creating the folder and a request canceler.
   */
  public createFolder = async (
    payload: StorageTypes.CreateFolderByUuidPayload,
  ): Promise<[Promise<StorageTypes.CreateFolderResponse>, RequestCanceler]> => {
    const storageClient = SdkManager.instance.getStorage();
    return storageClient.createFolderByUuid(payload);
  };

  public findExistentFolder = async (
    parentFolderUuid: string,
    plainName: string,
  ): Promise<DriveFolderItem | undefined> => {
    const storageClient = SdkManager.instance.getStorage();
    const { existentFolders } = await storageClient.checkDuplicatedFolders({
      folderUuid: parentFolderUuid,
      folderNamesList: [plainName],
    });

    const existentFolder = existentFolders[0];
    if (!existentFolder) return undefined;

    return {
      itemType: 'folder',
      uuid: existentFolder.uuid,
      bucket: existentFolder.bucket,
      status: existentFolder.deleted ? FileStatus.TRASHED : FileStatus.EXISTS,
      name: existentFolder.plainName ?? existentFolder.plain_name ?? existentFolder.name,
      parentUuid: existentFolder.parentUuid,
      createdAt: new Date(existentFolder.createdAt),
      updatedAt: new Date(existentFolder.updatedAt),
      creationTime: new Date(existentFolder.createdAt),
      modificationTime: new Date(existentFolder.updatedAt),
    };
  };

  public renameFolder = async (payload: { folderUuid: string; name: string }): Promise<void> => {
    const storageClient = SdkManager.instance.getStorage();
    await storageClient.updateFolderNameWithUUID(payload);
  };
}
