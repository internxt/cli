import { WebDavMethodHandler, WebDavMethodHandlerOptions } from '../../types/webdav.types';
import { XMLUtils } from '../../utils/xml.utils';
import { DriveFileItem, DriveFolderItem } from '../../types/drive.types';
import path, { ParsedPath } from 'path';
import { DriveFolderService } from '../../services/drive/drive-folder.service';
import { FormatUtils } from '../../utils/format.utils';
import { Request, Response } from 'express';

export type WebDavRequestedResource = {
  type: 'file' | 'folder' | 'root';
  name: string;
  path: ParsedPath;
};
export class PROPFINDRequestHandler implements WebDavMethodHandler {
  constructor(
    private options: WebDavMethodHandlerOptions = { debug: false },
    private dependencies: { driveFolderService: DriveFolderService },
  ) {}

  handle = async (req: Request, res: Response) => {
    const resource = this.getRequestedResource(req);

    switch (resource.type) {
      case 'root':
        res.status(200).send(await this.getRootFolderContentXML(req.user));
        break;
      case 'file':
        res.status(200).send(await this.getFileMetaXML(resource));
        break;
      case 'folder':
        res.status(200).send(await this.getFolderMetaXML(resource));
        break;
    }
  };

  private getRequestedResource(req: Request): WebDavRequestedResource {
    const parsedPath = path.parse(req.url);
    // This is the root of the WebDav folder
    if (req.url === '/webdav' || req.url === '/webdav/') {
      return {
        type: 'root',
        name: 'root',
        path: parsedPath,
      };
    }

    // Assume this is a file
    if (parsedPath.ext) {
      return {
        type: 'file',
        name: parsedPath.name,
        path: parsedPath,
      };
      // Otherwise, this is a folder
    } else {
      return {
        type: 'folder',
        name: parsedPath.name,
        path: parsedPath,
      };
    }
  }

  private async getFileMetaXML(resource: WebDavRequestedResource): Promise<string> {
    // For now this is mocked data
    const driveFile = this.driveFileItemToXMLNode({
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
    });
    return XMLUtils.toWebDavXML([driveFile], {
      arrayNodeName: 'D:response',
    });
  }

  private async getFolderMetaXML(resource: WebDavRequestedResource): Promise<string> {
    // For now this is mocked data
    const driveFile = this.driveFolderItemToXMLNode({
      name: resource.name,
      bucket: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      id: 0,
      encryptedName: '',
      uuid: '',
    });
    return XMLUtils.toWebDavXML([driveFile], {
      arrayNodeName: 'D:response',
    });
  }

  private async getRootFolderContentXML(user: Request['user']) {
    const { driveFolderService } = this.dependencies;
    const rootFolder = await driveFolderService.getFolderMetaById(user.rootFolderId);

    const folderContent = await driveFolderService.getFolderContent(rootFolder.uuid);

    const foldersXML = folderContent.folders.map((folder) =>
      this.driveFolderItemToXMLNode({
        name: folder.plainName,
        bucket: folder.bucket,
        createdAt: new Date(folder.createdAt),
        updatedAt: new Date(folder.updatedAt),
        id: folder.id,
        encryptedName: folder.name,
        uuid: folder.uuid,
      }),
    );

    const filesXML = folderContent.files.map((file) =>
      this.driveFileItemToXMLNode({
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
      }),
    );

    return XMLUtils.toWebDavXML(foldersXML.concat(filesXML), {
      arrayNodeName: 'D:response',
    });
  }

  private driveFolderItemToXMLNode(driveFolderItem: DriveFolderItem): object {
    const displayName = `${driveFolderItem.name}`;
    const driveFolderXML = {
      'D:href': path.join('/webdav', encodeURIComponent(displayName)),
      'D:propstat': {
        'D:status': 'HTTP/1.1 200 OK',
        'D:prop': {
          'D:displayname': displayName,
          'D:getlastmodified': FormatUtils.formatDateForWebDav(driveFolderItem.updatedAt),
          'D:getcontentlength': 0,
          'D:resourcetype': {
            'D:collection': '',
          },
        },
      },
    };

    return driveFolderXML;
  }

  private driveFileItemToXMLNode(driveFileItem: DriveFileItem): object {
    const displayName = driveFileItem.type ? `${driveFileItem.name}.${driveFileItem.type}` : driveFileItem.name;

    const driveFileXML = {
      'D:href': path.join('/webdav', encodeURIComponent(displayName)),
      'D:propstat': {
        'D:status': 'HTTP/1.1 200 OK',
        'D:prop': {
          'D:displayname': displayName,
          'D:getlastmodified': FormatUtils.formatDateForWebDav(driveFileItem.updatedAt),
          'D:getcontentlength': driveFileItem.size,
        },
      },
    };

    return driveFileXML;
  }
}
