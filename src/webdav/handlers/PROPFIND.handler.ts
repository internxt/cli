import { WebDavMethodHandler, WebDavMethodHandlerOptions } from '../../types/webdav.types';
import { XMLUtils } from '../../utils/xml.utils';
import { DriveFileItem, DriveFolderItem } from '../../types/drive.types';
import path from 'path';
import { DriveFolderService } from '../../services/drive/drive-folder.service';
import { FormatUtils } from '../../utils/format.utils';
import { Request, Response } from 'express';
export class PROPFINDRequestHandler implements WebDavMethodHandler {
  constructor(
    private options: WebDavMethodHandlerOptions = { debug: false },
    private dependencies: { driveFolderService: DriveFolderService },
  ) {}

  handle = async (req: Request, res: Response) => {
    const { resourceType } = this.extractRequestedResource(req);
    if (resourceType === 'root') {
      res.status(200).send(await this.getRootFolderContent(req.user));
      return;
    }

    if (resourceType === 'file') {
      // TODO: Implement get file meta

      return;
    }

    if (resourceType === 'folder') {
      // TODO: Implement get folder meta
      return;
    }
  };

  private extractRequestedResource(req: Request): {
    resourceType: 'file' | 'folder' | 'root';
    resourceName: string;
  } {
    // This is the root of the WebDav folder
    if (req.url === '/webdav' || req.url === '/webdav/') {
      return {
        resourceType: 'root',
        resourceName: 'root',
      };
    }

    const parsedUrl = path.parse(req.url);

    // Assume this is a file
    if (parsedUrl.ext) {
      return {
        resourceType: 'file',
        resourceName: parsedUrl.name,
      };
      // Otherwise, this is a folder
    } else {
      return {
        resourceType: 'folder',
        resourceName: parsedUrl.name,
      };
    }
  }

  private async getRootFolderContent(user: Request['user']) {
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
    const displayName = `${driveFileItem.name}${driveFileItem.type ? `.${driveFileItem.type}` : ''}`;

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
