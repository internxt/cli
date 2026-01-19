import { StorageTypes } from '@internxt/sdk/dist/drive';
import { SdkManager } from '../sdk-manager.service';
import { FetchPaginatedFile, FetchPaginatedFolder } from '@internxt/sdk/dist/drive/storage/types';
import { AuthService } from '../auth.service';
import { WorkspaceCredentialsDetails } from '../../types/command.types';

export class TrashService {
  static readonly instance = new TrashService();

  public trashItems = (payload: StorageTypes.AddItemsToTrashPayload) => {
    const storageClient = SdkManager.instance.getStorage();
    return storageClient.addItemsToTrash(payload);
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
    const currentWorkspace = await AuthService.instance.getCurrentWorkspace();
    const currentWorkspaceCreds = currentWorkspace?.workspaceCredentials;
    if (currentWorkspaceCreds) {
      const workspaceClient = SdkManager.instance.getWorkspaces();
      return workspaceClient.emptyPersonalTrash(currentWorkspaceCreds.id);
    } else {
      const trashClient = SdkManager.instance.getTrash();
      return trashClient.clearTrash();
    }
  };

  public getTrashFolderContent = async () => {
    const currentWorkspace = await AuthService.instance.getCurrentWorkspace();
    const currentWorkspaceCreds = currentWorkspace?.workspaceCredentials;
    const folders = await this.getAllTrashSubfolders(currentWorkspaceCreds, 0);
    const files = await this.getAllTrashSubfiles(currentWorkspaceCreds, 0);
    return { folders, files };
  };

  private readonly getAllTrashSubfolders = async (
    currentWorkspace: WorkspaceCredentialsDetails | undefined,
    offset: number,
  ): Promise<FetchPaginatedFolder[]> => {
    let folders: FetchPaginatedFolder[];

    if (currentWorkspace) {
      const workspaceClient = SdkManager.instance.getWorkspaces();
      const promise = workspaceClient.getPersonalTrash(currentWorkspace.id, 'folder', offset, 50);
      folders = (await promise).result as unknown as FetchPaginatedFolder[];
    } else {
      const trashClient = SdkManager.instance.getTrash();
      const promise = trashClient.getTrashedFilesPaginated(50, offset, 'folders', true);
      folders = (await promise).result as unknown as FetchPaginatedFolder[];
    }

    if (folders.length > 0) {
      return folders.concat(await this.getAllTrashSubfolders(currentWorkspace, offset + folders.length));
    } else {
      return folders;
    }
  };

  private readonly getAllTrashSubfiles = async (
    currentWorkspace: WorkspaceCredentialsDetails | undefined,
    offset: number,
  ): Promise<FetchPaginatedFile[]> => {
    let files: FetchPaginatedFile[];

    if (currentWorkspace) {
      const workspaceClient = SdkManager.instance.getWorkspaces();
      const promise = workspaceClient.getPersonalTrash(currentWorkspace.id, 'file', offset, 50);
      files = (await promise).result as unknown as FetchPaginatedFile[];
    } else {
      const trashClient = SdkManager.instance.getTrash();
      const promise = trashClient.getTrashedFilesPaginated(50, offset, 'files', true);
      files = (await promise).result as unknown as FetchPaginatedFile[];
    }

    if (files.length > 0) {
      return files.concat(await this.getAllTrashSubfiles(currentWorkspace, offset + files.length));
    } else {
      return files;
    }
  };
}
