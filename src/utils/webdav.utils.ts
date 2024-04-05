import { Request } from 'express';
import path from 'path';
import { WebDavRequestedResource } from '../types/webdav.types';
import { DriveDatabaseManager } from '../services/database/drive-database-manager.service';
import { DriveFolder } from '../services/database/drive-folder/drive-folder.domain';
import { DriveFile } from '../services/database/drive-file/drive-file.domain';

export class WebDavUtils {
  static joinURL(...pathComponents: string[]): string {
    return path.posix.join(...pathComponents);
  }

  static async getRequestedResource(
    req: Request,
    driveDatabaseManager: DriveDatabaseManager,
  ): Promise<WebDavRequestedResource> {
    const decodedUrl = decodeURI(req.url);
    const parsedPath = path.parse(decodedUrl);

    let isFolder = req.url.endsWith('/');

    if (!isFolder) {
      const findDatabaseItem = await driveDatabaseManager.findByRelativePath(decodedUrl);
      if (findDatabaseItem) {
        if (findDatabaseItem instanceof DriveFile) {
          isFolder = false;
        } else if (findDatabaseItem instanceof DriveFolder) {
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
