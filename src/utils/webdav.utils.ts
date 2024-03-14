import { Request } from 'express';
import path from 'path';
import { WebDavRequestedResource } from '../types/webdav.types';

export class WebDavUtils {
  static joinPath(...pathComponents: string[]): string {
    return path.posix.join(...pathComponents);
  }

  static getRequestedResource(req: Request): WebDavRequestedResource {
    const decodedUrl = decodeURI(req.url);
    const parsedPath = path.parse(decodedUrl);

    if (req.url.endsWith('/')) {
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
