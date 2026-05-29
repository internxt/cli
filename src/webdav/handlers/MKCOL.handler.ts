import { WebDavMethodHandler } from '../../types/webdav.types';
import { Request, Response } from 'express';
import { WebDavUtils } from '../../utils/webdav.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { XMLUtils } from '../../utils/xml.utils';
import { WebDavFolderService } from '../../services/webdav/webdav-folder.service';
import { AsyncUtils } from '../../utils/async.utils';

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
      webdavLogger.info(`[MKCOL] Folder '${resource.url}' already exists, ignoring the creation request`);
      res.status(201).send(XMLUtils.toWebDavXML({}, {}));
      return;
    }

    const newFolder = await WebDavFolderService.instance.createFolder({
      folderName: resource.path.base,
      parentFolderUuid: parentDriveFolderItem.uuid,
    });

    webdavLogger.info(`[MKCOL] ✅ Folder created with UUID ${newFolder.uuid}`);

    // This aims to prevent this issue: https://inxt.atlassian.net/browse/PB-1446
    await AsyncUtils.sleep(500);

    res.status(201).send(XMLUtils.toWebDavXML({}, {}));
  };
}
