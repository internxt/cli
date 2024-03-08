import { WebDavMethodHandler, WebDavMethodHandlerOptions } from '../../types/webdav.types';
import { XMLUtils } from '../../utils/xml.utils';
import { DriveFileItem, DriveFolderItem } from '../../types/drive.types';
import path, { ParsedPath } from 'path';
import { DriveFolderService } from '../../services/drive/drive-folder.service';
import { FormatUtils } from '../../utils/format.utils';
import { Request, Response } from 'express';
import { DriveRealmManager } from '../../services/realms/drive-realm-manager.service';

export type WebDavRequestedResource = {
  type: 'file' | 'folder' | 'root';
  url: string;
  name: string;
  path: ParsedPath;
};
export class PROPFINDRequestHandler implements WebDavMethodHandler {
  constructor(
    private options: WebDavMethodHandlerOptions = { debug: false },
    private dependencies: { driveFolderService: DriveFolderService; driveRealmManager: DriveRealmManager },
  ) {}

  handle = async (req: Request, res: Response) => {
    const resource = this.getRequestedResource(req);

    switch (resource.type) {
      case 'root': {
        const rootFolder = await this.dependencies.driveFolderService.getFolderMetaById(req.user.rootFolderId);
        res.status(200).send(await this.getFolderContentXML('/', rootFolder.uuid));
        break;
      }
      case 'file': {
        const folderPath = path.join(path.dirname(resource.url), '/');
        const driveParentFolder = await this.dependencies.driveRealmManager.findByRelativePath(
          decodeURIComponent(folderPath),
        );

        if (!driveParentFolder) {
          res.status(404).send();
          return;
        }

        res.status(200).send(await this.getFileMetaXML(resource));
        break;
      }

      case 'folder': {
        const driveParentFolder = await this.dependencies.driveRealmManager.findByRelativePath(
          decodeURIComponent(resource.url),
        );

        if (!driveParentFolder) {
          res.status(404).send();
          return;
        }

        res.status(200).send(await this.getFolderContentXML(resource.url, driveParentFolder.uuid));
        break;
      }
    }
  };

  private getRequestedResource(req: Request): WebDavRequestedResource {
    const parsedPath = path.parse(req.url);

    // This is the root of the WebDav folder
    if (req.url === '/') {
      return {
        type: 'root',
        name: 'root',
        url: req.url,
        path: parsedPath,
      };
    }

    if (req.url.endsWith('/')) {
      return {
        url: req.url,
        type: 'folder',
        name: parsedPath.name,
        path: parsedPath,
      };
    } else {
      return {
        type: 'file',
        url: req.url,
        name: parsedPath.name,
        path: parsedPath,
      };
    }
  }

  private async getFileMetaXML(resource: WebDavRequestedResource): Promise<string> {
    // For now this is mocked data
    const driveFile = this.driveFileItemToXMLNode(
      {
        name: resource.path.name,
        type: resource.path.ext.slice(1),
        bucket: '',
        id: 0,
        uuid: '',
        fileId: '',
        encryptedName: '',
        size: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      resource.url,
    );
    return XMLUtils.toWebDavXML([driveFile], {
      arrayNodeName: 'response',
    });
  }

  private async getFolderContentXML(relativePath: string, folderUuid: string) {
    const { driveFolderService, driveRealmManager } = this.dependencies;

    const folderContent = await driveFolderService.getFolderContent(folderUuid);

    const foldersXML = folderContent.folders.map((folder) => {
      const folderRelativePath = path.join(relativePath, encodeURIComponent(folder.plainName), '/');

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
        folderRelativePath,
      );
    });

    await Promise.all(
      folderContent.folders.map(async (folder) => {
        return driveRealmManager.createFolder({
          ...folder,
          name: folder.plainName,
          encryptedName: folder.name,
        });
      }),
    );

    const filesXML = folderContent.files.map((file) => {
      const fileRelativePath = path.join(relativePath, encodeURIComponent(file.plainName));
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
          size: Number(file.size),
        },
        fileRelativePath,
      );
    });

    const xml = XMLUtils.toWebDavXML(foldersXML.concat(filesXML), {
      arrayNodeName: 'response',
    });

    return xml;
  }

  private driveFolderItemToXMLNode(driveFolderItem: DriveFolderItem, relativePath: string): object {
    const displayName = `${driveFolderItem.name}`;

    const driveFolderXML = {
      href: relativePath,
      propstat: {
        status: 'HTTP/1.1 200 OK',
        prop: {
          displayname: displayName,
          getlastmodified: FormatUtils.formatDateForWebDav(driveFolderItem.updatedAt),
          getcontentlength: 0,
          resourcetype: {
            collection: '',
          },
        },
      },
    };

    return driveFolderXML;
  }

  private driveFileItemToXMLNode(driveFileItem: DriveFileItem, relativePath: string): object {
    const displayName = driveFileItem.type ? `${driveFileItem.name}.${driveFileItem.type}` : driveFileItem.name;

    const driveFileXML = {
      href: relativePath,
      propstat: {
        status: 'HTTP/1.1 200 OK',
        prop: {
          displayname: displayName,
          getlastmodified: FormatUtils.formatDateForWebDav(driveFileItem.updatedAt),
          getcontentlength: driveFileItem.size,
        },
      },
    };

    return driveFileXML;
  }
}
