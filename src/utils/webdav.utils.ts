import { Request } from 'express';
import path from 'path';
import { WebDavRequestedResource } from '../types/webdav.types';
import { DriveRealmManager } from '../services/realms/drive-realm-manager.service';
import { DriveFolderRealmSchema } from '../services/realms/drive-folders.realm';
import { DriveFileRealmSchema } from '../services/realms/drive-files.realm';

export class WebDavUtils {
  static joinURL(...pathComponents: string[]): string {
    return path.posix.join(...pathComponents);
  }

  static getRequestedResource(req: Request, driveRealmManager: DriveRealmManager): WebDavRequestedResource {
    const decodedUrl = decodeURI(req.url);
    const parsedPath = path.parse(decodedUrl);

    let isFolder = req.url.endsWith('/');

    if (!isFolder) {
      const findRealmItem = driveRealmManager.findByRelativePath(decodedUrl);
      if (findRealmItem) {
        if (findRealmItem instanceof DriveFileRealmSchema) {
          isFolder = false;
        } else if (findRealmItem instanceof DriveFolderRealmSchema) {
          isFolder = true;
        }
      }
    }

    if (isFolder) {
      return {
        url: decodedUrl,
        type: 'folder',
        name: parsedPath.name,
        path: parsedPath,
      };
    } else {
      return {
        type: 'file',
        url: decodedUrl,
        name: parsedPath.name,
        path: parsedPath,
      };
    }
  }
}
