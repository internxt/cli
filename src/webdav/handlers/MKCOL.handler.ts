import { WebDavMethodHandler } from '../../types/webdav.types';
import { Request, Response } from 'express';
import { WebDavUtils } from '../../utils/webdav.utils';
import { DriveFolderService } from '../../services/drive/drive-folder.service';
import { webdavLogger } from '../../utils/logger.utils';
import { XMLUtils } from '../../utils/xml.utils';
import { WebDavFolderService } from '../services/webdav-folder.service';
import { MethodNotAllowed } from '../../utils/errors.utils';

export class MKCOLRequestHandler implements WebDavMethodHandler {
  constructor(
    private readonly dependencies: {
      driveFolderService: DriveFolderService;
      webDavFolderService: WebDavFolderService;
    },
  ) {}

  handle = async (req: Request, res: Response) => {
    const { driveFolderService, webDavFolderService } = this.dependencies;
    const resource = await WebDavUtils.getRequestedResource(req);

    webdavLogger.info(`[MKCOL] Request received for ${resource.type} at ${resource.url}`);

    const parentDriveFolderItem =
      (await webDavFolderService.getDriveFolderItemFromPath(resource.parentPath)) ??
      (await webDavFolderService.createParentPathOrThrow(resource.parentPath));

    const driveFolderItem = await WebDavUtils.getDriveItemFromResource({
      resource,
      driveFolderService,
    });

    const folderAlreadyExists = !!driveFolderItem;

    if (folderAlreadyExists) {
      webdavLogger.info(`[MKCOL] ❌ Folder '${resource.url}' already exists`);
      throw new MethodNotAllowed('Folder already exists');
    }

    const newFolder = await webDavFolderService.createFolder({
      folderName: resource.path.base,
      parentFolderUuid: parentDriveFolderItem.uuid,
    });

    webdavLogger.info(`[MKCOL] ✅ Folder created with UUID ${newFolder.uuid}`);

    res.status(201).send(XMLUtils.toWebDavXML({}, {}));
  };
}
