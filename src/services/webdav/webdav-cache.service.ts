import path from 'node:path';
import { FileStatus } from '@internxt/sdk/dist/drive/storage/types';
import { DriveFolderService } from '../drive/drive-folder.service';
import { DriveFileItem, DriveFolderItem, DriveItem } from '../../types/drive.types';
import { WebDavRequestedResource } from '../../types/webdav.types';
import { DriveUtils } from '../../utils/drive.utils';
import { WebDavUtils } from '../../utils/webdav.utils';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

type FolderContent = {
  folders: DriveFolderItem[];
  files: DriveFileItem[];
};

export class WebDavCacheService {
  public static readonly instance: WebDavCacheService = new WebDavCacheService();

  private static readonly ttlMs = 2 * 60 * 1000;

  private readonly items = new Map<string, CacheEntry<DriveItem>>();
  private readonly folderContents = new Map<string, CacheEntry<FolderContent>>();

  public getItemFromResource = async (resource: WebDavRequestedResource): Promise<DriveItem | undefined> => {
    const normalizedPath = resource.url.endsWith('/')
      ? this.normalizeFolderPath(resource.url)
      : this.normalizeFilePath(resource.url);
    const cached = this.getCachedItem(normalizedPath);
    if (cached) {
      return cached;
    }

    const driveItem = await WebDavUtils.getDriveItemFromResource({ ...resource, url: normalizedPath });
    if (driveItem?.status === FileStatus.EXISTS) {
      this.setItem(driveItem.itemType === 'folder' ? this.normalizeFolderPath(normalizedPath) : normalizedPath, driveItem);
      return driveItem;
    }
  };

  public getFileFromPath = async (filePath: string): Promise<DriveFileItem | undefined> => {
    const normalizedPath = this.normalizeFilePath(filePath);
    const cached = this.getCachedItem(normalizedPath);
    if (cached?.itemType === 'file') {
      return cached;
    }

    const driveFile = await WebDavUtils.getDriveFileFromResource(normalizedPath);
    if (driveFile?.status === FileStatus.EXISTS) {
      this.setItem(normalizedPath, driveFile);
      return driveFile;
    }
  };

  public getFolderFromPath = async (folderPath: string): Promise<DriveFolderItem | undefined> => {
    const normalizedPath = this.normalizeFolderPath(folderPath);
    const cached = this.getCachedItem(normalizedPath);
    if (cached?.itemType === 'folder') {
      return cached;
    }

    const driveFolder = await WebDavUtils.getDriveFolderFromResource(normalizedPath);
    if (driveFolder?.status === FileStatus.EXISTS) {
      this.setItem(normalizedPath, driveFolder);
      return driveFolder;
    }
  };

  public getFolderContent = async (folderPath: string, folderUuid: string): Promise<FolderContent> => {
    const normalizedPath = this.normalizeFolderPath(folderPath);
    const cached = this.getCachedFolderContent(normalizedPath);
    if (cached) {
      return cached;
    }

    const folderContent = await DriveFolderService.instance.getFolderContent(folderUuid);
    const mappedContent: FolderContent = {
      folders: folderContent.folders.map((folder) => ({
        itemType: 'folder',
        name: folder.plainName,
        bucket: folder.bucket,
        status: folder.deleted || folder.removed ? FileStatus.TRASHED : FileStatus.EXISTS,
        createdAt: new Date(folder.createdAt),
        updatedAt: new Date(folder.updatedAt),
        creationTime: new Date(folder.creationTime),
        modificationTime: new Date(folder.modificationTime),
        uuid: folder.uuid,
        parentUuid: folder.parentUuid,
      })),
      files: folderContent.files.map((file) => ({
        itemType: 'file',
        name: file.plainName,
        bucket: file.bucket,
        fileId: file.fileId,
        uuid: file.uuid,
        type: file.type,
        status: file.status,
        folderUuid: file.folderUuid,
        size: DriveUtils.parseFileSize(file.size),
        creationTime: new Date(file.creationTime),
        modificationTime: new Date(file.modificationTime),
        createdAt: new Date(file.createdAt),
        updatedAt: new Date(file.updatedAt),
      })),
    };

    for (const folder of mappedContent.folders) {
      this.setItem(WebDavUtils.joinURL(normalizedPath, folder.name, '/'), folder);
    }
    for (const file of mappedContent.files) {
      const fileName = file.type ? `${file.name}.${file.type}` : file.name;
      this.setItem(WebDavUtils.joinURL(normalizedPath, fileName), file);
    }

    this.setFolderContent(normalizedPath, mappedContent);
    return mappedContent;
  };

  public registerFile = (filePath: string, file: DriveFileItem): void => {
    const normalizedPath = this.normalizeFilePath(filePath);
    this.setItem(normalizedPath, file);
    this.invalidateFolderContent(this.getParentFolderPath(normalizedPath));
  };

  public registerFolder = (folderPath: string, folder: DriveFolderItem): void => {
    const normalizedPath = this.normalizeFolderPath(folderPath);
    this.setItem(normalizedPath, folder);
    this.invalidateFolderContent(this.getParentFolderPath(normalizedPath));
  };

  public invalidateResource = (resourcePath: string): void => {
    const itemPath = resourcePath.endsWith('/') ? this.normalizeFolderPath(resourcePath) : this.normalizeFilePath(resourcePath);
    this.items.delete(itemPath);
    this.folderContents.delete(this.normalizeFolderPath(resourcePath));
    this.invalidateFolderContent(this.getParentFolderPath(itemPath));
  };

  public invalidateFolderContent = (folderPath: string): void => {
    this.folderContents.delete(this.normalizeFolderPath(folderPath));
  };

  public clear = (): void => {
    this.items.clear();
    this.folderContents.clear();
  };

  private getCachedItem(path: string): DriveItem | undefined {
    return this.getCachedValue(this.items, path);
  }

  private getCachedFolderContent(path: string): FolderContent | undefined {
    return this.getCachedValue(this.folderContents, path);
  }

  private getCachedValue<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
    const entry = cache.get(key);
    if (!entry) {
      return;
    }

    if (entry.expiresAt <= Date.now()) {
      cache.delete(key);
      return;
    }

    return entry.value;
  }

  private setItem(path: string, value: DriveItem): void {
    this.items.set(path, this.createEntry(value));
  }

  private setFolderContent(path: string, value: FolderContent): void {
    this.folderContents.set(path, this.createEntry(value));
  }

  private createEntry<T>(value: T): CacheEntry<T> {
    return {
      value,
      expiresAt: Date.now() + WebDavCacheService.ttlMs,
    };
  }

  private normalizeFilePath(filePath: string): string {
    const normalizedPath = path.posix.normalize(filePath);
    return normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
  }

  private normalizeFolderPath(folderPath: string): string {
    return WebDavUtils.normalizeFolderPath(this.normalizeFilePath(folderPath));
  }

  private getParentFolderPath(resourcePath: string): string {
    return WebDavUtils.normalizeFolderPath(path.posix.dirname(resourcePath));
  }
}
