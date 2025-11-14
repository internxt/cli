import path from 'node:path';
import { WebDavRequestedResource } from '../types/webdav.types';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { DriveFileService } from '../services/drive/drive-file.service';
import { DriveFileItem, DriveFolderItem, DriveItem } from '../types/drive.types';
import { webdavLogger } from './logger.utils';

export class WebDavUtils {
  static joinURL(...pathComponents: string[]): string {
    return path.posix.join(...pathComponents);
  }

  static removeHostFromURL(completeURL: string) {
    // add a temp http schema if its not present
    if (!completeURL.startsWith('/') && !/^https?:\/\//i.test(completeURL)) {
      completeURL = 'https://' + completeURL;
    }

    const parsedUrl = new URL(completeURL);
    let url = parsedUrl.href.replace(parsedUrl.origin + '/', '');
    if (!url.startsWith('/')) url = '/'.concat(url);
    return url;
  }

  static decodeUrl(requestUrl: string, decodeUri = true): string {
    return (decodeUri ? decodeURIComponent(requestUrl) : requestUrl).replaceAll('/./', '/');
  }

  static normalizeFolderPath(path: string): string {
    let normalizedPath = path;

    if (!normalizedPath.startsWith('/')) {
      normalizedPath = `/${normalizedPath}`;
    }

    if (!normalizedPath.endsWith('/')) {
      normalizedPath = `${normalizedPath}/`;
    }
    return normalizedPath;
  }

  static async getRequestedResource(requestUrl: string, decodeUri = true): Promise<WebDavRequestedResource> {
    const decodedUrl = this.decodeUrl(requestUrl, decodeUri);
    const parsedPath = path.parse(decodedUrl);
    const parentPath = this.normalizeFolderPath(path.dirname(decodedUrl));

    return {
      url: decodedUrl,
      name: parsedPath.base,
      path: parsedPath,
      parentPath,
    };
  }

  static async tryGetFileOrFolderMetadata({
    url,
    driveFileService,
    driveFolderService,
  }: {
    url: string;
    driveFolderService: DriveFolderService;
    driveFileService: DriveFileService;
  }): Promise<DriveItem | undefined> {
    try {
      return await driveFileService.getFileMetadataByPath(url);
    } catch {
      return await driveFolderService.getFolderMetadataByPath(url);
    }
  }

  static async getDriveFileFromResource({
    url,
    driveFileService,
  }: {
    url: string;
    driveFileService: DriveFileService;
  }): Promise<DriveFileItem | undefined> {
    try {
      return await driveFileService.getFileMetadataByPath(url);
    } catch (err) {
      webdavLogger.error('Exception while getting the file metadata by path', err);
    }
  }

  static async getDriveFolderFromResource({
    url,
    driveFolderService,
  }: {
    url: string;
    driveFolderService: DriveFolderService;
  }): Promise<DriveFolderItem | undefined> {
    try {
      return await driveFolderService.getFolderMetadataByPath(url);
    } catch (err) {
      webdavLogger.error('Exception while getting the folder metadata by path', err);
    }
  }

  static async getDriveItemFromResource({
    resource,
    driveFolderService,
    driveFileService,
  }: {
    resource: WebDavRequestedResource;
    driveFolderService: DriveFolderService;
    driveFileService: DriveFileService;
  }): Promise<DriveItem | undefined> {
    let item: DriveItem | undefined = undefined;

    const isFolder = resource.url.endsWith('/');

    try {
      if (isFolder) {
        item = await driveFolderService.getFolderMetadataByPath(resource.url);
      } else {
        item = await this.tryGetFileOrFolderMetadata({
          url: resource.url,
          driveFileService,
          driveFolderService,
        });
      }
    } catch {
      //no op
    }
    return item;
  }
}
