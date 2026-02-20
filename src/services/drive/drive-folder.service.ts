import { FetchPaginatedFile, FetchPaginatedFolder, FileStatus } from '@internxt/sdk/dist/drive/storage/types';
import { SdkManager } from '../sdk-manager.service';
import { StorageTypes } from '@internxt/sdk/dist/drive';
import { DriveFolderItem } from '../../types/drive.types';
import { DriveUtils } from '../../utils/drive.utils';
import { RequestCanceler } from '@internxt/sdk/dist/shared/http/types';
import { AuthService } from '../auth.service';
import { WorkspaceCredentialsDetails } from '../../types/command.types';
import { FolderRepository } from '../database/drive-folder/drive-folder.repository';
import { DriveFolder } from '../database/drive-folder/drive-folder.domain';
import { FileRepository } from '../database/drive-file/drive-file.repository';
import { DriveFile } from '../database/drive-file/drive-file.domain';

export class DriveFolderService {
  static readonly instance = new DriveFolderService();

  public getFolderMetaByUuid = async (uuid: string): Promise<DriveFolderItem> => {
    const storageClient = SdkManager.instance.getStorage();
    const folderMeta = await storageClient.getFolderMeta(uuid);
    const folderItem = DriveUtils.driveFolderMetaToItem(folderMeta);
    FolderRepository.instance.createOrUpdate([folderItem]);
    return folderItem;
  };

  public getFolderMetaById = async (id: number): Promise<DriveFolderItem> => {
    const storageClient = SdkManager.instance.getStorage();
    const folderMeta = await storageClient.getFolderMetaById(id);
    const folderItem = DriveUtils.driveFolderMetaToItem(folderMeta);
    FolderRepository.instance.createOrUpdate([folderItem]);
    return folderItem;
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
      folders = (await workspaceContentPromise).result as unknown as FetchPaginatedFolder[];
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

    FolderRepository.instance.createOrUpdate(
      folders.map(
        (folder) =>
          new DriveFolder({
            uuid: folder.uuid,
            name: folder.plainName,
            parentUuid: folder.parentUuid,
            status: FileStatus.EXISTS,
            createdAt: new Date(folder.createdAt),
            updatedAt: new Date(folder.updatedAt),
            creationTime: new Date(folder.creationTime ?? folder.createdAt),
            modificationTime: new Date(folder.modificationTime ?? folder.updatedAt),
          }),
      ),
    );

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
      files = (await workspaceContentPromise).result as unknown as FetchPaginatedFile[];
    } else {
      const storageClient = SdkManager.instance.getStorage();
      const [folderContentPromise] = storageClient.getFolderFilesByUuid(folderUuid, offset, 50, 'plainName', 'ASC');
      files = (await folderContentPromise).files;
    }

    FileRepository.instance.createOrUpdate(
      files.map(
        (file) =>
          new DriveFile({
            uuid: file.uuid,
            name: file.plainName,
            type: file.type,
            folderUuid: file.folderUuid,
            status: FileStatus.EXISTS,
            bucket: file.bucket,
            size: Number(file.size ?? 0),
            fileId: file.fileId,
            createdAt: new Date(file.createdAt),
            updatedAt: new Date(file.updatedAt),
            creationTime: new Date(file.creationTime ?? file.createdAt),
            modificationTime: new Date(file.modificationTime ?? file.updatedAt),
          }),
      ),
    );

    if (files.length > 0) {
      return files.concat(await this.getAllSubfiles(currentWorkspace, folderUuid, offset + files.length));
    } else {
      return files;
    }
  };

  public moveFolder = async (
    uuid: string,
    payload: StorageTypes.MoveFolderUuidPayload,
  ): Promise<StorageTypes.FolderMeta> => {
    const storageClient = SdkManager.instance.getStorage();
    const folderMeta = await storageClient.moveFolderByUuid(uuid, payload);
    const folderItem = DriveUtils.driveFolderMetaToItem(folderMeta);
    FolderRepository.instance.createOrUpdate([folderItem]);
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
    const currentWorkspace = await AuthService.instance.getCurrentWorkspace();
    if (currentWorkspace) {
      const workspaceClient = SdkManager.instance.getWorkspaces();
      return workspaceClient.createFolder({
        workspaceId: currentWorkspace.workspaceCredentials.id,
        parentFolderUuid: payload.parentFolderUuid,
        plainName: payload.plainName,
      });
    } else {
      const storageClient = SdkManager.instance.getStorage();
      return storageClient.createFolderByUuid(payload);
    }
  };

  public renameFolder = async (payload: { folderUuid: string; name: string }): Promise<void> => {
    const storageClient = SdkManager.instance.getStorage();
    await storageClient.updateFolderNameWithUUID(payload);
    FolderRepository.instance.updateByUuid(payload.folderUuid, { name: payload.name });
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
