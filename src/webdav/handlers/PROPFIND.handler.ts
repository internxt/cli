import { WebDavMethodHandler, WebDavRequestedResource } from '../../types/webdav.types';
import { XMLUtils } from '../../utils/xml.utils';
import { DriveFileItem, DriveFolderItem } from '../../types/drive.types';
import { DriveItemBD } from '../../services/database/drive-item/drive-item.domain';
import { DriveItemRepository } from '../../services/database/drive-item/drive-item.repository';
import { FormatUtils } from '../../utils/format.utils';
import { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import mime from 'mime-types';
import { WebDavUtils } from '../../utils/webdav.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { UsageService } from '../../services/usage.service';
import { WebDavFastPathService } from '../../services/webdav/webdav-fast-path.service';

export class PROPFINDRequestHandler implements WebDavMethodHandler {
  private static readonly SYNOLOGY_LOCK_KEEPALIVE_STALE_MS = 10 * 60 * 1000;

  handle = async (req: Request, res: Response) => {
    const resource = await WebDavUtils.getRequestedResource(req.url);
    webdavLogger.info(`[PROPFIND] Request received for item at ${resource.url}`);

    const driveItem = await WebDavFastPathService.instance.getItemFromResource(resource);

    if (!driveItem) {
      res.status(404).send();
      return;
    }

    switch (driveItem.itemType) {
      case 'file': {
        const fileMetaXML = await this.getFileMetaXML(resource, driveItem);
        res.status(207).send(fileMetaXML);
        break;
      }

      case 'folder': {
        const depth = req.header('depth') ?? '1';
        const folderMetaXML = await this.getFolderContentXML(resource, driveItem, depth);
        res.status(207).send(folderMetaXML);
        break;
      }
    }
  };

  private readonly getFileMetaXML = async (
    resource: WebDavRequestedResource,
    driveFileItem: DriveFileItem,
  ): Promise<string> => {
    const driveFile = this.driveFileItemToXMLNode(driveFileItem, resource.url);
    const xml = XMLUtils.toWebDavXML([driveFile], {
      arrayNodeName: XMLUtils.addDefaultNamespace('response'),
    });

    return xml;
  };

  private readonly getFolderContentXML = async (
    resource: WebDavRequestedResource,
    folderItem: DriveFolderItem,
    depth: string,
  ) => {
    const relativePath = resource.url;
    const isRootFolder = resource.url === '/';
    let XMLNodes: object[] = [];

    switch (depth) {
      case '0':
        if (isRootFolder) {
          XMLNodes.push(await this.driveFolderRootStatsToXMLNode(folderItem, relativePath));
        } else {
          XMLNodes.push(this.driveFolderItemToXMLNode(folderItem, relativePath));
        }
        break;
      case '1':
      default:
        if (isRootFolder) {
          XMLNodes.push(await this.driveFolderRootStatsToXMLNode(folderItem, relativePath));
          XMLNodes = XMLNodes.concat(await this.getFolderChildsXMLNode(relativePath, folderItem.uuid));
        } else {
          XMLNodes.push(this.driveFolderItemToXMLNode(folderItem, relativePath));
          XMLNodes = XMLNodes.concat(await this.getFolderChildsXMLNode(relativePath, folderItem.uuid));
        }
        break;
    }

    const xml = XMLUtils.toWebDavXML(XMLNodes, {
      arrayNodeName: XMLUtils.addDefaultNamespace('response'),
      ignoreAttributes: false,
      suppressEmptyNode: true,
    });
    return xml;
  };

  private readonly getFolderChildsXMLNode = async (relativePath: string, folderUuid: string) => {
    const folderContent = await WebDavFastPathService.instance.getFolderContent(relativePath, folderUuid);
    const files = await this.filterStaleSynologyLockKeepAliveFiles(relativePath, folderContent.files);

    const xmlNodes: object[] = [];
    const cachedItems: DriveItemBD[] = [];

    for (const folder of folderContent.folders) {
      const folderRelativePath = WebDavUtils.joinURL(relativePath, folder.name, '/');

      xmlNodes.push(
        this.driveFolderItemToXMLNode(
          {
            itemType: 'folder',
            name: folder.name,
            bucket: folder.bucket,
            status: folder.status,
            createdAt: folder.createdAt,
            updatedAt: folder.updatedAt,
            creationTime: folder.creationTime,
            modificationTime: folder.modificationTime,
            uuid: folder.uuid,
            parentUuid: folder.parentUuid,
          },
          folderRelativePath,
        ),
      );

      cachedItems.push(
        new DriveItemBD({
          uuid: folder.uuid,
          path: folderRelativePath,
          type: 'folder',
          createdAt: new Date(folder.createdAt),
          updatedAt: new Date(),
        }),
      );
    }

    for (const file of files) {
      const fileRelativePath = WebDavUtils.joinURL(relativePath, this.getFileDisplayName(file));

      xmlNodes.push(
        this.driveFileItemToXMLNode(
          {
            itemType: 'file',
            name: file.name,
            bucket: file.bucket,
            fileId: file.fileId,
            uuid: file.uuid,
            type: file.type,
            status: file.status,
            folderUuid: file.folderUuid,
            size: Number(file.size),
            creationTime: file.creationTime,
            modificationTime: file.modificationTime,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
          },
          fileRelativePath,
        ),
      );

      cachedItems.push(
        new DriveItemBD({
          uuid: file.uuid,
          path: fileRelativePath,
          type: 'file',
          createdAt: file.createdAt,
          updatedAt: new Date(),
        }),
      );
    }

    if (cachedItems.length > 0) {
      await DriveItemRepository.instance.createOrUpdate(cachedItems);
    }

    return xmlNodes;
  };

  private readonly filterStaleSynologyLockKeepAliveFiles = async (
    relativePath: string,
    files: DriveFileItem[],
  ): Promise<DriveFileItem[]> => {
    if (!(await WebDavFastPathService.instance.isEnabled())) return files;
    if (!/\/Control\/lock\/?$/.test(relativePath)) return files;

    const lockFiles = files.filter((file) => this.isSynologyLockKeepAliveFile(file));
    if (lockFiles.length === 0) return files;

    const newestLock = lockFiles.reduce((newest, file) =>
      this.getFileModifiedTime(file) > this.getFileModifiedTime(newest) ? file : newest,
    );
    const now = Date.now();
    const staleLocks = new Set(
      lockFiles
        .filter((file) => {
          const isOlderDuplicate = file.uuid !== newestLock.uuid;
          const isExpired =
            now - this.getFileModifiedTime(file) > PROPFINDRequestHandler.SYNOLOGY_LOCK_KEEPALIVE_STALE_MS;
          return isOlderDuplicate || isExpired;
        })
        .map((file) => file.uuid),
    );

    if (staleLocks.size === 0) return files;

    for (const file of files) {
      if (!staleLocks.has(file.uuid)) continue;

      const lockPath = WebDavUtils.joinURL(relativePath, this.getFileDisplayName(file));
      webdavLogger.warn(`[PROPFIND] Hiding and deleting stale Synology lock keepalive file at ${lockPath}`);
      void WebDavUtils.deleteOrTrashItem(file)
        .then(() => WebDavFastPathService.instance.invalidateResource(lockPath))
        .catch((error) =>
          webdavLogger.warn(
            `[PROPFIND] Failed to delete stale Synology lock keepalive file at ${lockPath}: ${
              error instanceof Error ? error.message : String(error)
            }`,
          ),
        );
    }

    return files.filter((file) => !staleLocks.has(file.uuid));
  };

  private readonly isSynologyLockKeepAliveFile = (file: DriveFileItem): boolean => {
    return file.size === 0 && this.getFileDisplayName(file).startsWith('lock_keep_alive.@writer_version_');
  };

  private readonly getFileDisplayName = (file: DriveFileItem): string => {
    return file.type ? `${file.name}.${file.type}` : file.name;
  };

  private readonly getFileModifiedTime = (file: DriveFileItem): number => {
    return (file.modificationTime ?? file.updatedAt ?? file.createdAt).getTime();
  };

  private readonly driveFolderRootStatsToXMLNode = async (
    driveFolderItem: DriveFolderItem,
    relativePath: string,
  ): Promise<object> => {
    const totalUsage = await UsageService.instance.fetchUsage();
    const spaceLimit = await UsageService.instance.fetchSpaceLimit();

    const driveFolderXML = {
      [XMLUtils.addDefaultNamespace('href')]: XMLUtils.encodeWebDavUri(relativePath),
      [XMLUtils.addDefaultNamespace('propstat')]: {
        [XMLUtils.addDefaultNamespace('status')]: 'HTTP/1.1 200 OK',
        [XMLUtils.addDefaultNamespace('prop')]: {
          [XMLUtils.addDefaultNamespace('getcontenttype')]: 'application/octet-stream',
          'x1:lastmodified': {
            '#text': FormatUtils.formatDateForWebDav(driveFolderItem.updatedAt),
            '@_xmlns:x1': 'SAR:',
          },
          'x2:executable': {
            '#text': 'F',
            '@_xmlns:x2': 'http://apache.org/dav/props/',
          },
          'x3:Win32FileAttributes': {
            '#text': '00000030',
            '@_xmlns:x3': 'urn:schemas-microsoft-com:',
          },
          [XMLUtils.addDefaultNamespace('quota-available-bytes')]: spaceLimit - totalUsage,
          [XMLUtils.addDefaultNamespace('quota-used-bytes')]: totalUsage,
          [XMLUtils.addDefaultNamespace('resourcetype')]: {
            [XMLUtils.addDefaultNamespace('collection')]: '',
          },
        },
      },
    };
    return driveFolderXML;
  };

  private readonly driveFolderItemToXMLNode = (driveFolderItem: DriveFolderItem, relativePath: string): object => {
    const displayName = `${driveFolderItem.name}`;

    const driveFolderXML = {
      [XMLUtils.addDefaultNamespace('href')]: XMLUtils.encodeWebDavUri(relativePath),
      [XMLUtils.addDefaultNamespace('propstat')]: {
        [XMLUtils.addDefaultNamespace('status')]: 'HTTP/1.1 200 OK',
        [XMLUtils.addDefaultNamespace('prop')]: {
          [XMLUtils.addDefaultNamespace('displayname')]: displayName,
          [XMLUtils.addDefaultNamespace('getlastmodified')]: FormatUtils.formatDateForWebDav(driveFolderItem.updatedAt),
          [XMLUtils.addDefaultNamespace('getcontentlength')]: 0,
          [XMLUtils.addDefaultNamespace('resourcetype')]: {
            [XMLUtils.addDefaultNamespace('collection')]: '',
          },
        },
      },
    };

    return driveFolderXML;
  };

  private readonly driveFileItemToXMLNode = (driveFileItem: DriveFileItem, relativePath: string): object => {
    const displayName = driveFileItem.type ? `${driveFileItem.name}.${driveFileItem.type}` : driveFileItem.name;
    const lastModified = FormatUtils.formatDateForWebDav(driveFileItem.modificationTime ?? driveFileItem.updatedAt);

    const driveFileXML = {
      [XMLUtils.addDefaultNamespace('href')]: XMLUtils.encodeWebDavUri(relativePath),
      [XMLUtils.addDefaultNamespace('propstat')]: {
        [XMLUtils.addDefaultNamespace('status')]: 'HTTP/1.1 200 OK',
        [XMLUtils.addDefaultNamespace('prop')]: {
          [XMLUtils.addDefaultNamespace('resourcetype')]: '',
          [XMLUtils.addDefaultNamespace('getetag')]: '"' + randomUUID().replaceAll('-', '') + '"',
          [XMLUtils.addDefaultNamespace('displayname')]: displayName,
          [XMLUtils.addDefaultNamespace('getcontenttype')]: mime.lookup(displayName) || 'application/octet-stream',
          [XMLUtils.addDefaultNamespace('getlastmodified')]: lastModified,
          [XMLUtils.addDefaultNamespace('getcontentlength')]: driveFileItem.size,
        },
      },
    };

    return driveFileXML;
  };
}
