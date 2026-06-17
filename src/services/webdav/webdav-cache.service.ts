import path from 'node:path';
import { DriveFileItem, DriveFolderItem } from '../../types/drive.types';

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

export type WebDavFolderContent = {
  folders: DriveFolderItem[];
  files: DriveFileItem[];
};

export class WebDavCacheService {
  public static readonly instance = new WebDavCacheService();

  private static readonly TTL_MS = 10 * 60 * 1000;

  private readonly foldersByPath = new Map<string, CacheEntry<DriveFolderItem>>();
  private readonly filesByPath = new Map<string, CacheEntry<DriveFileItem>>();
  private readonly folderContentByPath = new Map<string, CacheEntry<WebDavFolderContent>>();

  private readonly normalizeFolderPath = (folderPath: string): string => {
    let normalizedPath = folderPath || '/';
    if (!normalizedPath.startsWith('/')) normalizedPath = `/${normalizedPath}`;
    if (!normalizedPath.endsWith('/')) normalizedPath = `${normalizedPath}/`;
    return normalizedPath;
  };

  private readonly normalizeFilePath = (filePath: string): string => {
    const normalizedPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
    return normalizedPath.length > 1 ? normalizedPath.replace(/\/$/, '') : normalizedPath;
  };

  private readonly entry = <T>(value: T): CacheEntry<T> => ({
    value,
    expiresAt: Date.now() + WebDavCacheService.TTL_MS,
  });

  private readonly getFresh = <T>(map: Map<string, CacheEntry<T>>, key: string): T | undefined => {
    const cached = map.get(key);
    if (!cached) return;
    if (cached.expiresAt < Date.now()) {
      map.delete(key);
      return;
    }
    return cached.value;
  };

  getFolder = (folderPath: string) => this.getFresh(this.foldersByPath, this.normalizeFolderPath(folderPath));

  setFolder = (folderPath: string, folder: DriveFolderItem) => {
    this.foldersByPath.set(this.normalizeFolderPath(folderPath), this.entry(folder));
  };

  getFile = (filePath: string) => this.getFresh(this.filesByPath, this.normalizeFilePath(filePath));

  setFile = (filePath: string, file: DriveFileItem) => {
    this.filesByPath.set(this.normalizeFilePath(filePath), this.entry(file));
  };

  getFolderContent = (folderPath: string) =>
    this.getFresh(this.folderContentByPath, this.normalizeFolderPath(folderPath));

  setFolderContent = (folderPath: string, folderContent: WebDavFolderContent) => {
    this.folderContentByPath.set(this.normalizeFolderPath(folderPath), this.entry(folderContent));
  };

  invalidateResource = (resourcePath: string) => {
    const filePath = this.normalizeFilePath(resourcePath);
    const folderPath = this.normalizeFolderPath(resourcePath);
    const parentFolderPath = this.normalizeFolderPath(path.posix.dirname(filePath));

    this.filesByPath.delete(filePath);
    this.foldersByPath.delete(folderPath);
    this.folderContentByPath.delete(folderPath);
    this.folderContentByPath.delete(parentFolderPath);
  };

  clear = () => {
    this.foldersByPath.clear();
    this.filesByPath.clear();
    this.folderContentByPath.clear();
  };
}
