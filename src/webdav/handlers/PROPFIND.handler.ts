import { WebDavMethodHandler, WebDavMethodHandlerOptions, WebDavRequestedResource } from '../../types/webdav.types';
import { XMLUtils } from '../../utils/xml.utils';
import { DriveFileItem, DriveFolderItem } from '../../types/drive.types';
import { DriveFolderService } from '../../services/drive/drive-folder.service';
import { FormatUtils } from '../../utils/format.utils';
import { Request, Response } from 'express';
import { DriveRealmManager } from '../../services/realms/drive-realm-manager.service';
import { WebDavUtils } from '../../utils/webdav.utils';
import { NotFoundError } from '../../utils/errors.utils';

export class PROPFINDRequestHandler implements WebDavMethodHandler {
  constructor(
    private options: WebDavMethodHandlerOptions = { debug: false },
    private dependencies: { driveFolderService: DriveFolderService; driveRealmManager: DriveRealmManager },
  ) {}

  handle = async (req: Request, res: Response) => {
    const resource = WebDavUtils.getRequestedResource(req);
    switch (resource.type) {
      case 'file': {
        res.status(200).send(await this.getFileMetaXML(resource));
        break;
      }

      case 'folder': {
        if (resource.url === '/') {
          const rootFolder = await this.dependencies.driveFolderService.getFolderMetaById(req.user.rootFolderId);
          await this.dependencies.driveRealmManager.createFolder({
            name: '',
            encryptedName: rootFolder.name,
            bucket: rootFolder.bucket,
            id: rootFolder.id,
            parentId: rootFolder.parentId,
            uuid: rootFolder.uuid,
            createdAt: new Date(rootFolder.createdAt),
            updatedAt: new Date(rootFolder.updatedAt),
          });
          res.status(200).send(await this.getFolderContentXML('/', rootFolder.uuid));
          break;
        }

        const driveParentFolder = await this.dependencies.driveRealmManager.findByRelativePath(resource.url);

        if (!driveParentFolder) {
          res.status(404).send();
          return;
        }

        res.status(200).send(await this.getFolderContentXML(resource.url, driveParentFolder.uuid));
        break;
      }
    }
  };

  private async getFileMetaXML(resource: WebDavRequestedResource): Promise<string> {
    const driveFileItem = await this.dependencies.driveRealmManager.findByRelativePath(resource.url);

    if (!driveFileItem || !('size' in driveFileItem)) throw new NotFoundError('File not found');
    const driveFile = this.driveFileItemToXMLNode(
      {
        name: driveFileItem.name,
        type: driveFileItem.type,
        bucket: driveFileItem.bucket,
        id: driveFileItem.id,
        uuid: driveFileItem.uuid,
        fileId: driveFileItem.file_id,
        encryptedName: driveFileItem.name,
        size: driveFileItem.size,
        createdAt: driveFileItem.created_at,
        updatedAt: driveFileItem.updated_at,
        status: driveFileItem.status,
        folderId: driveFileItem.folder_id,
      },
      encodeURI(resource.url),
    );
    const xml = XMLUtils.toWebDavXML([driveFile], {
      arrayNodeName: 'response',
    });

    return xml;
  }

  private async getFolderContentXML(relativePath: string, folderUuid: string) {
    const { driveFolderService, driveRealmManager } = this.dependencies;

    const folderContent = await driveFolderService.getFolderContent(folderUuid);

    const foldersXML = folderContent.folders.map((folder) => {
      const folderRelativePath = WebDavUtils.getHref(relativePath, folder.plainName, '/');

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
      const fileRelativePath = WebDavUtils.getHref(
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

    await Promise.all(
      folderContent.files.map(async (file) => {
        return driveRealmManager.createFile({
          ...file,
          name: file.plainName,
          fileId: file.fileId,
          size: Number(file.size),
          encryptedName: file.name,
        });
      }),
    );

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
