import { WebDavMethodHandler, WebDavMethodHandlerOptions, WebDavRequestedResource } from '../../types/webdav.types';
import { XMLUtils } from '../../utils/xml.utils';
import { DriveFileItem, DriveFolderItem } from '../../types/drive.types';
import { DriveFolderService } from '../../services/drive/drive-folder.service';
import { DriveFileService } from '../../services/drive/drive-file.service';
import { FormatUtils } from '../../utils/format.utils';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import mime from 'mime-types';
import { DriveDatabaseManager } from '../../services/database/drive-database-manager.service';
import { WebDavUtils } from '../../utils/webdav.utils';
import { webdavLogger } from '../../utils/logger.utils';

export class PROPFINDRequestHandler implements WebDavMethodHandler {
  constructor(
    private options: WebDavMethodHandlerOptions = { debug: false },
    private dependencies: {
      driveFolderService: DriveFolderService;
      driveFileService: DriveFileService;
      driveDatabaseManager: DriveDatabaseManager;
    },
  ) {}

  handle = async (req: Request, res: Response) => {
    const { driveDatabaseManager, driveFolderService, driveFileService } = this.dependencies;

    const resource = await WebDavUtils.getRequestedResource(req);
    webdavLogger.info('[PROPFIND] Request received', { resource });

    const driveItem = await WebDavUtils.getAndSearchItemFromResource({
      resource,
      driveDatabaseManager,
      driveFolderService,
      driveFileService,
    });

    switch (resource.type) {
      case 'file': {
        const fileMetaXML = await this.getFileMetaXML(resource, driveItem as DriveFileItem);
        console.error({ fileMetaXML });
        res.status(207).send(fileMetaXML);
        break;
      }

      case 'folder': {
        const depth = req.header('depth') ?? '1';
        const folderMetaXML = await this.getFolderContentXML(resource, driveItem as DriveFolderItem, depth);
        console.error({ folderMetaXML });
        res.status(207).send(folderMetaXML);
        break;
      }
    }
  };

  private async getFileMetaXML(resource: WebDavRequestedResource, driveFileItem: DriveFileItem): Promise<string> {
    const driveFile = this.driveFileItemToXMLNode(
      {
        name: driveFileItem.name,
        type: driveFileItem.type,
        bucket: driveFileItem.bucket,
        id: driveFileItem.id,
        uuid: driveFileItem.uuid,
        fileId: driveFileItem.fileId,
        encryptedName: driveFileItem.name,
        size: driveFileItem.size,
        createdAt: driveFileItem.createdAt,
        updatedAt: driveFileItem.updatedAt,
        status: driveFileItem.status,
        folderId: driveFileItem.folderId,
        folderUuid: driveFileItem.folderUuid,
      },
      resource.url,
    );
    const xml = XMLUtils.toWebDavXML([driveFile], {
      arrayNodeName: XMLUtils.addDefaultNamespace('response'),
    });

    return xml;
  }

  private async getFolderContentXML(resource: WebDavRequestedResource, folderItem: DriveFolderItem, depth: string) {
    const relativePath = resource.url;
    const isRootFolder = resource.url === '/';
    let XMLNodes: object[] = [];

    switch (depth) {
      case '0':
        if (isRootFolder) {
          XMLNodes.push(this.driveFolderRootStatsToXMLNode(folderItem, relativePath));
        } else {
          XMLNodes.push(this.driveFolderItemToXMLNode(folderItem, relativePath));
        }
        break;
      case '1':
      default:
        if (isRootFolder) {
          XMLNodes.push(this.driveFolderRootStatsToXMLNode(folderItem, relativePath));
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
  }

  private async getFolderChildsXMLNode(relativePath: string, folderUuid: string) {
    const { driveFolderService, driveDatabaseManager } = this.dependencies;

    const folderContent = await driveFolderService.getFolderContent(folderUuid);

    const foldersXML = folderContent.folders.map((folder) => {
      const folderRelativePath = WebDavUtils.joinURL(relativePath, folder.plainName, '/');

      return this.driveFolderItemToXMLNode(
        {
          name: folder.plainName,
          bucket: folder.bucket,
          status: folder.deleted || folder.removed ? 'TRASHED' : 'EXISTS',
          createdAt: new Date(folder.createdAt),
          updatedAt: new Date(folder.updatedAt),
          id: folder.id,
          encryptedName: folder.name,
          uuid: folder.uuid,
          parentId: null,
          parentUuid: null,
        },
        folderRelativePath,
      );
    });

    await Promise.all(
      folderContent.folders.map((folder) => {
        const folderRelativePath = WebDavUtils.joinURL(relativePath, folder.plainName, '/');
        return driveDatabaseManager.createFolder(
          {
            ...folder,
            name: folder.plainName,
            encryptedName: folder.name,
            status: folder.deleted || folder.removed ? 'TRASHED' : 'EXISTS',
          },
          folderRelativePath,
        );
      }),
    );

    const filesXML = folderContent.files.map((file) => {
      const fileRelativePath = WebDavUtils.joinURL(
        relativePath,
        file.type ? `${file.plainName}.${file.type}` : file.plainName,
      );
      return this.driveFileItemToXMLNode(
        {
          name: file.plainName,
          bucket: file.bucket,
          id: file.id,
          createdAt: new Date(file.createdAt),
          updatedAt: new Date(file.updatedAt),
          fileId: file.fileId,
          uuid: file.uuid,
          type: file.type,
          encryptedName: file.name,
          status: file.status,
          folderId: file.folderId,
          folderUuid: file.folderUuid,
          size: Number(file.size),
        },
        fileRelativePath,
      );
    });

    await Promise.all(
      folderContent.files.map((file) => {
        const fileRelativePath = WebDavUtils.joinURL(
          relativePath,
          file.type ? `${file.plainName}.${file.type}` : file.plainName,
        );
        return driveDatabaseManager.createFile(
          {
            ...file,
            name: file.plainName,
            fileId: file.fileId,
            size: Number(file.size),
            encryptedName: file.name,
          },
          fileRelativePath,
        );
      }),
    );

    return foldersXML.concat(filesXML);
  }

  private driveFolderRootStatsToXMLNode(driveFolderItem: DriveFolderItem, relativePath: string): object {
    const driveFolderXML = {
      [XMLUtils.addDefaultNamespace('href')]: encodeURIComponent(relativePath),
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
          [XMLUtils.addDefaultNamespace('resourcetype')]: {
            [XMLUtils.addDefaultNamespace('collection')]: '',
          },
        },
      },
    };
    return driveFolderXML;
  }

  private driveFolderItemToXMLNode(driveFolderItem: DriveFolderItem, relativePath: string): object {
    const displayName = `${driveFolderItem.name}`;

    const driveFolderXML = {
      [XMLUtils.addDefaultNamespace('href')]: encodeURIComponent(relativePath),
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
  }

  private driveFileItemToXMLNode(driveFileItem: DriveFileItem, relativePath: string): object {
    const displayName = driveFileItem.type ? `${driveFileItem.name}.${driveFileItem.type}` : driveFileItem.name;

    const driveFileXML = {
      [XMLUtils.addDefaultNamespace('href')]: encodeURIComponent(relativePath),
      [XMLUtils.addDefaultNamespace('propstat')]: {
        [XMLUtils.addDefaultNamespace('status')]: 'HTTP/1.1 200 OK',
        [XMLUtils.addDefaultNamespace('prop')]: {
          [XMLUtils.addDefaultNamespace('resourcetype')]: '',
          [XMLUtils.addDefaultNamespace('getetag')]: '"' + randomUUID().replaceAll('-', '') + '"',
          [XMLUtils.addDefaultNamespace('displayname')]: displayName,
          [XMLUtils.addDefaultNamespace('getcontenttype')]: mime.lookup(displayName) || 'application/octet-stream',
          [XMLUtils.addDefaultNamespace('getlastmodified')]: FormatUtils.formatDateForWebDav(driveFileItem.updatedAt),
          [XMLUtils.addDefaultNamespace('getcontentlength')]: driveFileItem.size,
        },
      },
    };

    return driveFileXML;
  }
}
