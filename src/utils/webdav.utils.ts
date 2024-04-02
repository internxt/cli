import { Request } from 'express';
import path from 'path';
import { WebDavRequestedResource } from '../types/webdav.types';
import { DriveRealmManager } from '../services/database/drive-database-manager.service';
import { DriveFolderRealmSchema } from '../services/database/drive-folders.model';
import { DriveFileRealmSchema } from '../services/database/drive-files.model';

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
