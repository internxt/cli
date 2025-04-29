import { Request } from 'express';
import path from 'node:path';
import { WebDavRequestedResource } from '../types/webdav.types';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { DriveFileService } from '../services/drive/drive-file.service';
import { DriveFileItem, DriveFolderItem } from '../types/drive.types';
import { NotFoundError } from './errors.utils';

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

  static async getRequestedResource(urlObject: string | Request, decodeUri = true): Promise<WebDavRequestedResource> {
    let requestUrl: string;
    if (typeof urlObject === 'string') {
      requestUrl = urlObject;
    } else {
      requestUrl = urlObject.url;
    }
    const decodedUrl = (decodeUri ? decodeURIComponent(requestUrl) : requestUrl).replaceAll('/./', '/');
    const parsedPath = path.parse(decodedUrl);
    let parentPath = path.dirname(decodedUrl);
    if (!parentPath.startsWith('/')) parentPath = '/'.concat(parentPath);
    if (!parentPath.endsWith('/')) parentPath = parentPath.concat('/');

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

  static async getDriveItemFromResource(
    resource: WebDavRequestedResource,
    driveFolderService?: DriveFolderService,
    driveFileService?: DriveFileService,
  ): Promise<DriveFileItem | DriveFolderItem | undefined> {
    let item: DriveFileItem | DriveFolderItem | undefined = undefined;
    if (resource.type === 'folder') {
      item = await driveFolderService?.getFolderMetadataByPath(resource.url);
    }
    if (resource.type === 'file') {
      item = await driveFileService?.getFileMetadataByPath(resource.url);
    }
    return item;
  }

  static async getAndSearchItemFromResource({
    resource,
    driveFolderService,
    driveFileService,
  }: {
    resource: WebDavRequestedResource;
    driveFolderService?: DriveFolderService;
    driveFileService?: DriveFileService;
  }): Promise<DriveFileItem | DriveFolderItem> {
    const driveItem = await this.getDriveItemFromResource(resource, driveFolderService, driveFileService);
    if (!driveItem) {
      throw new NotFoundError(`Resource not found on Internxt Drive at ${resource.url}`);
    }
    return driveItem;
  }
}
