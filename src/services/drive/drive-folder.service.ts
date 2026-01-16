import {
  FetchPaginatedFile,
  FetchPaginatedFilesContent,
  FetchPaginatedFolder,
  FetchPaginatedFoldersContent,
} from '@internxt/sdk/dist/drive/storage/types';
import { SdkManager } from '../sdk-manager.service';
import { StorageTypes } from '@internxt/sdk/dist/drive';
import { DriveFolderItem } from '../../types/drive.types';
import { DriveUtils } from '../../utils/drive.utils';
import { RequestCanceler } from '@internxt/sdk/dist/shared/http/types';
import { AuthService } from '../auth.service';
import { WorkspaceCredentialsDetails } from '../../types/command.types';

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
    const currentWorkspace = await AuthService.instance.getCurrentWorkspace();
    const currentWorkspaceCreds = currentWorkspace?.workspaceCredentials;
    const folders = await this.getAllSubfolders(currentWorkspaceCreds, folderUuid, 0);
    const files = await this.getAllSubfiles(currentWorkspaceCreds, folderUuid, 0);
    return { folders, files };
  };

  private readonly getAllSubfolders = async (
    currentWorkspace: WorkspaceCredentialsDetails | undefined,
    folderUuid: string,
    offset: number,
  ): Promise<FetchPaginatedFolder[]> => {
    let folders: FetchPaginatedFolder[];

    if (currentWorkspace) {
      const workspaceClient = SdkManager.instance.getWorkspaces();
      const [workspaceContentPromise] = workspaceClient.getFolders(
        currentWorkspace.id,
        folderUuid,
        offset,
        50,
        'plainName',
        'ASC',
      );
      folders = (await workspaceContentPromise).result as unknown as FetchPaginatedFoldersContent['folders'];
    } else {
      const storageClient = SdkManager.instance.getStorage();
      const [personalFolderContentPromise] = storageClient.getFolderFoldersByUuid(
        folderUuid,
        offset,
        50,
        'plainName',
        'ASC',
      );
      folders = (await personalFolderContentPromise).folders;
    }

    if (folders.length > 0) {
      return folders.concat(await this.getAllSubfolders(currentWorkspace, folderUuid, offset + folders.length));
    } else {
      return folders;
    }
  };

  private readonly getAllSubfiles = async (
    currentWorkspace: WorkspaceCredentialsDetails | undefined,
    folderUuid: string,
    offset: number,
  ): Promise<FetchPaginatedFile[]> => {
    let files: FetchPaginatedFile[];

    if (currentWorkspace) {
      const workspaceClient = SdkManager.instance.getWorkspaces();
      const [workspaceContentPromise] = workspaceClient.getFiles(
        currentWorkspace.id,
        folderUuid,
        offset,
        50,
        'plainName',
        'ASC',
      );
      files = (await workspaceContentPromise).result as unknown as FetchPaginatedFilesContent['files'];
    } else {
      const storageClient = SdkManager.instance.getStorage();
      const [folderContentPromise] = storageClient.getFolderFilesByUuid(folderUuid, offset, 50, 'plainName', 'ASC');
      files = (await folderContentPromise).files;
    }

    if (files.length > 0) {
      return files.concat(await this.getAllSubfiles(currentWorkspace, folderUuid, offset + files.length));
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
