import { Request } from 'express';
import path from 'node:path';
import { WebDavRequestedResource } from '../types/webdav.types';
import { DriveFile } from '../services/database/drive-file/drive-file.domain';
import { DriveFolder } from '../services/database/drive-folder/drive-folder.domain';
import { DriveDatabaseManager } from '../services/database/drive-database-manager.service';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { DriveFileService } from '../services/drive/drive-file.service';
import { DriveFileItem, DriveFolderItem } from '../types/drive.types';
import { ConflictError, NotFoundError } from './errors.utils';
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

  static async getRequestedResource(urlObject: string | Request): Promise<WebDavRequestedResource> {
    let requestUrl: string;
    if (typeof urlObject === 'string') {
      requestUrl = urlObject;
    } else {
      requestUrl = urlObject.url;
    }

    const decodedUrl = decodeURIComponent(requestUrl).replaceAll('/./', '/');
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

  static async getDatabaseItemFromResource(
    resource: WebDavRequestedResource,
    driveDatabaseManager: DriveDatabaseManager,
  ): Promise<DriveFileItem | DriveFolderItem | null> {
    let databaseResource: DriveFile | DriveFolder | null = null;
    if (resource.type === 'folder') {
      databaseResource = await driveDatabaseManager.findFolderByRelativePath(resource.url);
    }
    if (resource.type === 'file') {
      databaseResource = await driveDatabaseManager.findFileByRelativePath(resource.url);
    }
    return databaseResource?.toItem() ?? null;
  }

  static async setDatabaseItem(
    type: 'file' | 'folder',
    driveItem: DriveFileItem | DriveFolderItem,
    driveDatabaseManager: DriveDatabaseManager,
    relativePath: string,
  ): Promise<DriveFolder | DriveFile | undefined> {
    if (type === 'folder') {
      return await driveDatabaseManager.createFolder(driveItem as DriveFolderItem, relativePath);
    }
    if (type === 'file') {
      return await driveDatabaseManager.createFile(driveItem as DriveFileItem, relativePath);
    }
  }

  static async getDriveItemFromResource(
    resource: WebDavRequestedResource,
    driveFolderService?: DriveFolderService,
    driveFileService?: DriveFileService,
  ): Promise<DriveFileItem | DriveFolderItem | undefined> {
    let item: DriveFileItem | DriveFolderItem | undefined = undefined;

    if (resource.type === 'folder') {
      webdavLogger.info('Andrea: resource ->', { resource });
      // if resource has a parentPath it means it's a subfolder then try to get it; if it throws an error it means it doesn't 
      // exist and we should throw a 409 error in compliance with the WebDAV RFC
      // catch the error during getting parent folder and throw a 409 error in compliance with the WebDAV RFC

      try {
        item = await driveFolderService?.getFolderMetadataByPath(resource.url);
      }
      // TODO: get the exact error type from the SDK, it should be a 404 error
      catch (error: any) {
        // if the error is a 404 error, it means the resource doesn't exist
        // in this case, throw a 409 error in compliance with the WebDAV RFC
        // if error is of type AppError, throw it
        throw new ConflictError(`Resource not found on Internxt Drive at ${resource.url}`);
      }
    }
    if (resource.type === 'file') {
      item = await driveFileService?.getFileMetadataByPath(resource.url);
    }
    return item;
  }

  static async getAndSearchItemFromResource({
    resource,
    driveDatabaseManager,
    driveFolderService,
    driveFileService,
  }: {
    resource: WebDavRequestedResource;
    driveDatabaseManager: DriveDatabaseManager;
    driveFolderService?: DriveFolderService;
    driveFileService?: DriveFileService;
  }): Promise<DriveFileItem | DriveFolderItem> {
    let databaseItem = await this.getDatabaseItemFromResource(resource, driveDatabaseManager);

    if (!databaseItem) {
      webdavLogger.info('Resource not found on local database', { resource });
      const driveItem = await this.getDriveItemFromResource(resource, driveFolderService, driveFileService);
      if (!driveItem) {
        throw new NotFoundError(`Resource not found on Internxt Drive at ${resource.url}`);
      }
      databaseItem = driveItem;
      await this.setDatabaseItem(resource.type, driveItem, driveDatabaseManager, resource.url);
    }
    return databaseItem;
  }
}
