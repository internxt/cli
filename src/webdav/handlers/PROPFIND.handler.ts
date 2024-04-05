import { WebDavMethodHandler, WebDavMethodHandlerOptions, WebDavRequestedResource } from '../../types/webdav.types';
import { XMLUtils } from '../../utils/xml.utils';
import { DriveFileItem, DriveFolderItem } from '../../types/drive.types';
import { DriveFolderService } from '../../services/drive/drive-folder.service';
import { FormatUtils } from '../../utils/format.utils';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';
import mime from 'mime-types';
import { DriveDatabaseManager } from '../../services/database/drive-database-manager.service';
import { WebDavUtils } from '../../utils/webdav.utils';
import { NotFoundError } from '../../utils/errors.utils';

export class PROPFINDRequestHandler implements WebDavMethodHandler {
  constructor(
    private options: WebDavMethodHandlerOptions = { debug: false },
    private dependencies: { driveFolderService: DriveFolderService; driveDatabaseManager: DriveDatabaseManager },
  ) {}

  handle = async (req: Request, res: Response) => {
    const resource = await WebDavUtils.getRequestedResource(req, this.dependencies.driveDatabaseManager);
    const depth = req.header('depth') ?? '1';

    switch (resource.type) {
      case 'file': {
        res.status(207).send(await this.getFileMetaXML(resource));
        break;
      }

      case 'folder': {
        if (resource.url === '/') {
          const rootFolder = await this.dependencies.driveFolderService.getFolderMetaById(req.user.rootFolderId);
          await this.dependencies.driveDatabaseManager.createFolder({
            name: '',
            encryptedName: rootFolder.name,
            bucket: rootFolder.bucket,
            id: rootFolder.id,
            parentId: rootFolder.parentId,
            uuid: rootFolder.uuid,
            createdAt: new Date(rootFolder.createdAt),
            updatedAt: new Date(rootFolder.updatedAt),
          });
          res.status(207).send(await this.getFolderContentXML('/', rootFolder.uuid, depth, true));
          break;
        }

        const driveParentFolder = await this.dependencies.driveDatabaseManager.findByRelativePath(resource.url);

        if (!driveParentFolder) {
          res.status(404).send();
          return;
        }

        res.status(207).send(await this.getFolderContentXML(resource.url, driveParentFolder.uuid, depth));
        break;
      }
    }
  };

  private async getFileMetaXML(resource: WebDavRequestedResource): Promise<string> {
    const driveFileItem = await this.dependencies.driveDatabaseManager.findByRelativePath(resource.url);

    if (!driveFileItem || !('size' in driveFileItem)) throw new NotFoundError('File not found');
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
      },
      encodeURI(resource.url),
    );
    const xml = XMLUtils.toWebDavXML([driveFile], {
      arrayNodeName: XMLUtils.addDefaultNamespace('response'),
    });

    return xml;
  }

  private async getFolderContentXML(relativePath: string, folderUuid: string, depth: string, isRootFolder = false) {
    let XMLNodes: object[] = [];

    switch (depth) {
      case '0':
        if (isRootFolder) {
          XMLNodes.push(await this.getFolderRootXMLNode(relativePath, folderUuid));
        } else {
          XMLNodes.push(await this.getFolderXMLNode(relativePath, folderUuid));
        }
        break;
      case '1':
      default:
        if (isRootFolder) {
          XMLNodes.push(await this.getFolderRootXMLNode(relativePath, folderUuid));
          XMLNodes = XMLNodes.concat(await this.getFolderChildsXMLNode(relativePath, folderUuid));
        } else {
          XMLNodes.push(await this.getFolderXMLNode(relativePath, folderUuid));
          XMLNodes = XMLNodes.concat(await this.getFolderChildsXMLNode(relativePath, folderUuid));
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
          createdAt: new Date(folder.createdAt),
          updatedAt: new Date(folder.updatedAt),
          id: folder.id,
          encryptedName: folder.name,
          uuid: folder.uuid,
          parentId: null,
        },
        encodeURI(folderRelativePath),
      );
    });

    folderContent.folders.map(async (folder) => {
      return await driveDatabaseManager.createFolder({
        ...folder,
        name: folder.plainName,
        encryptedName: folder.name,
      });
    });

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
          size: Number(file.size),
        },
        encodeURI(fileRelativePath),
      );
    });

    folderContent.files.map(async (file) => {
      return await driveDatabaseManager.createFile({
        ...file,
        name: file.plainName,
        fileId: file.fileId,
        size: Number(file.size),
        encryptedName: file.name,
      });
    });

    return foldersXML.concat(filesXML);
  }

  private async getFolderRootXMLNode(relativePath: string, folderUuid: string) {
    const { driveFolderService } = this.dependencies;

    const folderMeta = await driveFolderService.getFolderMetaByUuid(folderUuid);
    const folderXML = this.driveFolderRootStatsToXMLNode(folderMeta, encodeURI(relativePath));
    return folderXML;
  }

  private async getFolderXMLNode(relativePath: string, folderUuid: string) {
    const { driveFolderService } = this.dependencies;

    const folderMeta = await driveFolderService.getFolderMetaByUuid(folderUuid);
    const folderXML = this.driveFolderItemToXMLNode(folderMeta, encodeURI(relativePath));
    return folderXML;
  }

  private driveFolderRootStatsToXMLNode(driveFolderItem: DriveFolderItem, relativePath: string): object {
    const driveFolderXML = {
      [XMLUtils.addDefaultNamespace('href')]: relativePath,
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
      [XMLUtils.addDefaultNamespace('href')]: relativePath,
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
      [XMLUtils.addDefaultNamespace('href')]: relativePath,
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
