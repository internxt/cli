import path from 'node:path';
import { WebDavRequestedResource } from '../types/webdav.types';
import { DriveFileItem, DriveFolderItem, DriveItem } from '../types/drive.types';
import { DriveItemService } from '../services/drive/drive-item.service';
import { webdavLogger } from './logger.utils';
import { ConfigService } from '../services/config.service';
import { TrashService } from '../services/drive/trash.service';
import { FormatUtils } from './format.utils';
import { DriveItemRepository } from '../services/database/drive-item/drive-item.repository';

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

  static async getDriveFileFromResource(url: string): Promise<DriveFileItem | undefined> {
    try {
      return await DriveItemService.instance.getFileByPath(url);
    } catch (err) {
      webdavLogger.error('Exception while getting the file metadata by path', err);
    }
  }

  static async getDriveFolderFromResource(url: string): Promise<DriveFolderItem | undefined> {
    try {
      return await DriveItemService.instance.getFolderByPath(url);
    } catch (err) {
      webdavLogger.error('Exception while getting the folder metadata by path', err);
    }
  }

  static async getDriveItemFromResource(resource: WebDavRequestedResource): Promise<DriveItem | undefined> {
    let item: DriveItem | undefined = undefined;

    const isFolder = resource.url.endsWith('/');

    try {
      if (isFolder) {
        item = await DriveItemService.instance.getFolderByPath(resource.url);
      } else {
        try {
          item = await DriveItemService.instance.getFileByPath(resource.url);
        } catch {
          item = await DriveItemService.instance.getFolderByPath(resource.url);
        }
      }
    } catch {
      //no op
    }
    return item;
  }

  static async deleteOrTrashItem<T extends { itemType: 'file' | 'folder'; uuid: string }>(driveItem: T) {
    const configs = await ConfigService.instance.readWebdavConfig();
    const type = FormatUtils.capitalizeFirstLetter(driveItem.itemType);
    if (configs.deleteFilesPermanently) {
      webdavLogger.info(`[DELETE] [${driveItem.uuid}] Deleting permanently ${driveItem.itemType}`);
      await TrashService.instance.deleteItemPermanently(driveItem.itemType, driveItem.uuid);

      webdavLogger.info(`[DELETE] [${driveItem.uuid}] ${type} deleted permanently successfully`);
    } else {
      webdavLogger.info(`[DELETE] [${driveItem.uuid}] Trashing ${driveItem.itemType}`);
      await TrashService.instance.trashItems({
        items: [{ type: driveItem.itemType, uuid: driveItem.uuid }],
      });
      webdavLogger.info(`[DELETE] [${driveItem.uuid}] ${type} trashed successfully`);
    }
    await DriveItemRepository.instance.delete([driveItem.uuid]);
  }
}
