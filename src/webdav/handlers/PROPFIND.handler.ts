import { Request, Response } from 'express';
import { WebDavMethodHandler, WebDavMethodHandlerOptions } from '../../types/webdav.types';
import { XMLUtils } from '../../utils/xml.utils';
import { DriveFolderItem } from '../../types/drive.types';
import path from 'path';
import { DriveFolderService } from '../../services/drive/drive-folder.service';
import { ConfigService } from '../../services/config.service';
import { webdavLogger } from '../../utils/logger.utils';
import { FormatUtils } from '../../utils/format.utils';

export class PROPFINDRequestHandler implements WebDavMethodHandler {
  private options: WebDavMethodHandlerOptions;
  constructor(options: WebDavMethodHandlerOptions = { debug: false }) {
    this.options = options;
  }
  handle = async (req: Request, res: Response) => {
    try {
      if (this.options.debug) {
        webdavLogger.info('Received PROPFIND request');
        webdavLogger.info('Request headers: ', req.headers);
        webdavLogger.info('Request body: ', XMLUtils.toJSON(req.body));
      }

      const credentials = await ConfigService.instance.readUser();
      if (!credentials) throw new Error('Missing credentials');
      const rootFolder = await DriveFolderService.instance.getFolderMetaById(credentials?.user.root_folder_id);

      const folderContent = await DriveFolderService.instance.getFolderContent(rootFolder.uuid);

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
      const xml = XMLUtils.toXML([...foldersXML], {
        format: true,
        arrayNodeName: 'D:response',
      });

      res.status(200).send(`<?xml version="1.0" encoding="utf-8" ?>
      <D:multistatus xmlns:D="DAV:">${xml}</D:multistatus>`);
    } catch (error) {
      webdavLogger.error('Error replying to PROPFIND request: ', error);
    }
  };

  private driveFolderItemToXMLNode(driveFileItem: DriveFolderItem) {
    const displayName = `${driveFileItem.name}`;
    const driveItemXML = {
      'D:href': path.join('/webdav', encodeURIComponent(displayName)),
      'D:propstat': {
        'D:status': 'HTTP/1.1 200 OK',
        'D:prop': {
          'D:displayname': displayName,
          'D:getlastmodified': FormatUtils.formatDateForWebDav(driveFileItem.updatedAt),
          'D:getcontentlength': 0,
          'D:resourcetype': {
            'D:collection': '',
          },
        },
      },
    };

    return driveItemXML;
  }
}
