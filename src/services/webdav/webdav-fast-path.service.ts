import { FileStatus } from '@internxt/sdk/dist/drive/storage/types';
import { AuthService } from '../auth.service';
import { ConfigService } from '../config.service';
import { DriveFolderService } from '../drive/drive-folder.service';
import { SdkManager } from '../sdk-manager.service';
import { DriveUtils } from '../../utils/drive.utils';
import { WebDavUtils } from '../../utils/webdav.utils';
import { DriveFileItem, DriveFolderItem, DriveItem } from '../../types/drive.types';
import { WebDavRequestedResource } from '../../types/webdav.types';
import { WebDavCacheService, WebDavFolderContent } from './webdav-cache.service';
import { MissingCredentialsError } from '../../types/command.types';

export class WebDavFastPathService {
  public static readonly instance = new WebDavFastPathService();

  private readonly folderContentFolderToItem = (folder: {
    uuid: string;
    plainName?: string;
    name?: string;
    bucket?: string;
    parentUuid: string | null;
    createdAt: string;
    updatedAt: string;
    creationTime?: string;
    modificationTime?: string;
    deleted?: boolean;
    removed?: boolean;
  }): DriveFolderItem => ({
    itemType: 'folder',
    uuid: folder.uuid,
    name: folder.plainName ?? folder.name ?? '',
    bucket: folder.bucket ?? null,
    parentUuid: folder.parentUuid,
    status: folder.deleted || folder.removed ? FileStatus.TRASHED : FileStatus.EXISTS,
    createdAt: new Date(folder.createdAt),
    updatedAt: new Date(folder.updatedAt),
    creationTime: new Date(folder.creationTime ?? folder.createdAt),
    modificationTime: new Date(folder.modificationTime ?? folder.updatedAt),
  });

  isEnabled = async (): Promise<boolean> => {
    const { hyperBackupMode } = await ConfigService.instance.readWebdavConfig();
    if (!hyperBackupMode) return false;

    try {
      const currentWorkspace = await AuthService.instance.getCurrentWorkspace();
      return !currentWorkspace;
    } catch (error) {
      if (error instanceof MissingCredentialsError) {
        return true;
      }
      throw error;
    }
  };

  getFolderFromPath = async (folderPath: string): Promise<DriveFolderItem | undefined> => {
    if (!(await this.isEnabled())) return WebDavUtils.getDriveFolderFromResource(folderPath);

    const normalizedPath = WebDavUtils.normalizeFolderPath(folderPath);
    const cached = WebDavCacheService.instance.getFolder(normalizedPath);
    if (cached) return cached;

    try {
      const storageClient = SdkManager.instance.getStorage();
      const folderMeta = await storageClient.getFolderByPath(normalizedPath);
      const folder = DriveUtils.driveFolderMetaToItem(folderMeta);
      if (folder.status !== FileStatus.EXISTS) return;

      WebDavCacheService.instance.setFolder(normalizedPath, folder);
      return folder;
    } catch {
      return;
    }
  };

  getFileFromPath = async (filePath: string): Promise<DriveFileItem | undefined> => {
    if (!(await this.isEnabled())) return WebDavUtils.getDriveFileFromResource(filePath);

    const cached = WebDavCacheService.instance.getFile(filePath);
    if (cached) return cached;

    try {
      const storageClient = SdkManager.instance.getStorage();
      const fileMeta = await storageClient.getFileByPath(filePath);
      const file = DriveUtils.driveFileMetaToItem(fileMeta);
      if (file.status !== FileStatus.EXISTS) return;

      WebDavCacheService.instance.setFile(filePath, file);
      return file;
    } catch {
      return;
    }
  };

  getItemFromResource = async (resource: WebDavRequestedResource): Promise<DriveItem | undefined> => {
    if (!(await this.isEnabled())) return WebDavUtils.getDriveItemFromResource(resource);

    if (resource.url.endsWith('/')) {
      return this.getFolderFromPath(resource.url);
    }

    return (await this.getFileFromPath(resource.url)) ?? (await this.getFolderFromPath(resource.url));
  };

  getFolderContent = async (folderPath: string, folderUuid: string): Promise<WebDavFolderContent> => {
    if (!(await this.isEnabled())) {
      const folderContent = await DriveFolderService.instance.getFolderContent(folderUuid);
      return {
        folders: folderContent.folders.map(this.folderContentFolderToItem),
        files: folderContent.files.map((file) => DriveUtils.driveFileMetaToItem(file)),
      };
    }

    const normalizedPath = WebDavUtils.normalizeFolderPath(folderPath);
    const cached = WebDavCacheService.instance.getFolderContent(normalizedPath);
    if (cached) return cached;

    const folderContent = await DriveFolderService.instance.getFolderContent(folderUuid);
    const mappedFolderContent = {
      folders: folderContent.folders.map(this.folderContentFolderToItem),
      files: folderContent.files.map((file) => DriveUtils.driveFileMetaToItem(file)),
    };

    WebDavCacheService.instance.setFolderContent(normalizedPath, mappedFolderContent);
    return mappedFolderContent;
  };

  registerCreatedFile = (filePath: string, file: DriveFileItem) => {
    WebDavCacheService.instance.setFile(filePath, file);
    WebDavCacheService.instance.invalidateResource(filePath);
    WebDavCacheService.instance.setFile(filePath, file);
  };

  registerCreatedFolder = (folderPath: string, folder: DriveFolderItem) => {
    WebDavCacheService.instance.setFolder(folderPath, folder);
    WebDavCacheService.instance.invalidateResource(folderPath);
    WebDavCacheService.instance.setFolder(folderPath, folder);
  };

  invalidateResource = (resourcePath: string) => {
    WebDavCacheService.instance.invalidateResource(resourcePath);
  };
}
