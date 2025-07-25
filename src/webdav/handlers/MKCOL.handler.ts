import { WebDavMethodHandler } from '../../types/webdav.types';
import { Request, Response } from 'express';
import { WebDavUtils } from '../../utils/webdav.utils';
import { DriveFolderService } from '../../services/drive/drive-folder.service';
import { webdavLogger } from '../../utils/logger.utils';
import { XMLUtils } from '../../utils/xml.utils';
import { AsyncUtils } from '../../utils/async.utils';
import { DriveFolderItem } from '../../types/drive.types';
import { ConflictError, MethodNotAllowed } from '../../utils/errors.utils';

export class MKCOLRequestHandler implements WebDavMethodHandler {
  constructor(
    private readonly dependencies: {
      driveFolderService: DriveFolderService;
    },
  ) {}

  handle = async (req: Request, res: Response) => {
    const { driveFolderService } = this.dependencies;
    const resource = await WebDavUtils.getRequestedResource(req);

    webdavLogger.info(`[MKCOL] Request received for ${resource.type} at ${resource.url}`);

    const parentResource = await WebDavUtils.getRequestedResource(resource.parentPath, false);

    const parentDriveItem = await WebDavUtils.getDriveItemFromResource({
      resource: parentResource,
      driveFolderService,
    });

    if (!parentDriveItem) {
      // WebDAV RFC
      // When the MKCOL operation creates a new collection resource,
      // all ancestors MUST already exist, or the method MUST fail
      // with a 409 (Conflict) status code
      throw new ConflictError(`Parent folders not found on Internxt Drive at ${resource.url}`);
    }
    const parentFolderItem = parentDriveItem as DriveFolderItem;

    const driveFolderItem = await WebDavUtils.getDriveItemFromResource({
      resource,
      driveFolderService,
    });

    const folderAlreadyExists = !!driveFolderItem;

    if (folderAlreadyExists) {
      webdavLogger.info(`[MKCOL] ❌ Folder '${resource.url}' already exists`);
      throw new MethodNotAllowed('Folder already exists');
    }

    const [createFolder] = driveFolderService.createFolder({
      plainName: resource.path.base,
      parentFolderUuid: parentFolderItem.uuid,
    });

    const newFolder = await createFolder;

    webdavLogger.info(`[MKCOL] ✅ Folder created with UUID ${newFolder.uuid}`);

    // This aims to prevent this issue: https://inxt.atlassian.net/browse/PB-1446
    await AsyncUtils.sleep(500);
    res.status(201).send(XMLUtils.toWebDavXML({}, {}));
  };
}
