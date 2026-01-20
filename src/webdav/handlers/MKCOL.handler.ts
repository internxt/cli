import { WebDavMethodHandler } from '../../types/webdav.types';
import { Request, Response } from 'express';
import { WebDavUtils } from '../../utils/webdav.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { XMLUtils } from '../../utils/xml.utils';
import { WebDavFolderService } from '../services/webdav-folder.service';
import { MethodNotAllowed } from '../../utils/errors.utils';

export class MKCOLRequestHandler implements WebDavMethodHandler {
  handle = async (req: Request, res: Response) => {
    const resource = await WebDavUtils.getRequestedResource(req.url);

    webdavLogger.info(`[MKCOL] Request received for folder at ${resource.url}`);

    const parentDriveFolderItem =
      (await WebDavFolderService.instance.getDriveFolderItemFromPath(resource.parentPath)) ??
      (await WebDavFolderService.instance.createParentPathOrThrow(resource.parentPath));

    const driveFolderItem = await WebDavUtils.getDriveFolderFromResource(resource.url);

    const folderAlreadyExists = !!driveFolderItem;

    if (folderAlreadyExists) {
      webdavLogger.info(`[MKCOL] ❌ Folder '${resource.url}' already exists`);
      throw new MethodNotAllowed('Folder already exists');
    }

    const newFolder = await WebDavFolderService.instance.createFolder({
      folderName: resource.path.base,
      parentFolderUuid: parentDriveFolderItem.uuid,
    });

    webdavLogger.info(`[MKCOL] ✅ Folder created with UUID ${newFolder.uuid}`);

    res.status(201).send(XMLUtils.toWebDavXML({}, {}));
  };
}
