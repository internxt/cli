import { Request } from 'express';
import path from 'node:path';
import { WebDavRequestedResource } from '../types/webdav.types';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { DriveFileService } from '../services/drive/drive-file.service';
import { DriveFileItem, DriveFolderItem } from '../types/drive.types';

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

  static async getRequestedResource(urlObject: string | Request, decodeUri = true): Promise<WebDavRequestedResource> {
    let requestUrl: string;
    if (typeof urlObject === 'string') {
      requestUrl = urlObject;
    } else {
      requestUrl = urlObject.url;
    }

    const decodedUrl = this.decodeUrl(requestUrl, decodeUri);
    const parsedPath = path.parse(decodedUrl);
    const parentPath = this.normalizeFolderPath(path.dirname(decodedUrl));

    const isFolder = requestUrl.endsWith('/');

    if (isFolder) {
      return {
        type: 'folder',
        url: decodedUrl,
        name: parsedPath.base,
        path: parsedPath,
        parentPath,
      };
    } else {
      return {
        type: 'file',
        url: decodedUrl,
        name: parsedPath.name,
        path: parsedPath,
        parentPath,
      };
    }
  }

  static async getDriveItemFromResource(params: {
    resource: WebDavRequestedResource;
    driveFolderService: DriveFolderService;
    driveFileService?: never;
  }): Promise<DriveFolderItem | undefined>;

  static async getDriveItemFromResource(params: {
    resource: WebDavRequestedResource;
    driveFolderService?: never;
    driveFileService: DriveFileService;
  }): Promise<DriveFileItem | undefined>;

  static async getDriveItemFromResource(params: {
    resource: WebDavRequestedResource;
    driveFolderService: DriveFolderService;
    driveFileService: DriveFileService;
  }): Promise<DriveFileItem | DriveFolderItem | undefined>;

  static async getDriveItemFromResource({
    resource,
    driveFolderService,
    driveFileService,
  }: {
    resource: WebDavRequestedResource;
    driveFolderService?: DriveFolderService;
    driveFileService?: DriveFileService;
  }): Promise<DriveFileItem | DriveFolderItem | undefined> {
    let item: DriveFileItem | DriveFolderItem | undefined = undefined;

    try {
      if (resource.type === 'folder') {
        item = await driveFolderService?.getFolderMetadataByPath(resource.url);
      }
      if (resource.type === 'file') {
        item = await driveFileService?.getFileMetadataByPath(resource.url);
      }
    } catch {
      //no op
    }
    return item;
  }
}
