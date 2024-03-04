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
  constructor(
    private options: WebDavMethodHandlerOptions = { debug: false },
    private dependencies: { driveFolderService: DriveFolderService; configService: ConfigService },
  ) {}
  handle = async (req: Request, res: Response) => {
    const { driveFolderService, configService } = this.dependencies;
    try {
      if (this.options.debug) {
        webdavLogger.info('Received PROPFIND request');
        webdavLogger.info('Request headers: ', req.headers);
        webdavLogger.info('Request body: ', XMLUtils.toJSON(req.body));
      }

      const credentials = await configService.readUser();
      if (!credentials) throw new Error('Missing credentials');
      const rootFolder = await driveFolderService.getFolderMetaById(credentials?.user.root_folder_id);

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
      const xml = XMLUtils.toXML([...foldersXML], {
        arrayNodeName: 'D:response',
      });

      const responseXml = `<?xml version="1.0" encoding="utf-8" ?><D:multistatus xmlns:D="DAV:">${xml}</D:multistatus>`;
      console.log('RESPONSE', responseXml);
      res.status(200).send(responseXml);
    } catch (error) {
      webdavLogger.error('Error replying to PROPFIND request: ', error);
      res.status(500).send('Internal server error');
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
