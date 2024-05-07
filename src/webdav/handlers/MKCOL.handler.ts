import { DriveDatabaseManager } from '../../services/database/drive-database-manager.service';
import { WebDavMethodHandler } from '../../types/webdav.types';
import { Request, Response } from 'express';
import { WebDavUtils } from '../../utils/webdav.utils';
import { NotFoundError } from '../../utils/errors.utils';
import { DriveFolderService } from '../../services/drive/drive-folder.service';
import { webdavLogger } from '../../utils/logger.utils';
import path from 'path';
import { XMLUtils } from '../../utils/xml.utils';
import { AsyncUtils } from '../../utils/async.utils';

export class MKCOLRequestHandler implements WebDavMethodHandler {
  constructor(
    private dependencies: {
      driveDatabaseManager: DriveDatabaseManager;
      driveFolderService: DriveFolderService;
    },
  ) {}

  handle = async (req: Request, res: Response) => {
    const { driveDatabaseManager, driveFolderService } = this.dependencies;
    const resourceParsedPath = path.parse(decodeURI(req.url));

    const parentPath = WebDavUtils.getParentPath(req.url);

    const parentResource = await driveDatabaseManager.findByRelativePath(parentPath);
    if (!parentResource) throw new NotFoundError(`Parent resource not found for parent path ${parentPath}`);
    webdavLogger.info(`MKCOL request received for folder at ${req.url}`);
    webdavLogger.info(`Parent path: ${parentResource.id}`);

    const [createFolder] = driveFolderService.createFolder({
      folderName: resourceParsedPath.name,
      parentFolderId: parentResource.id,
    });

    const newFolder = await createFolder;

    webdavLogger.info(`✅ Folder created with UUID ${newFolder.uuid}`);

    await driveDatabaseManager.createFolder({
      name: newFolder.plain_name,
      status: 'EXISTS',
      encryptedName: newFolder.name,
      bucket: newFolder.bucket,
      id: newFolder.id,
      parentId: newFolder.parentId,
      uuid: newFolder.uuid,
      createdAt: new Date(newFolder.createdAt),
      updatedAt: new Date(newFolder.updatedAt),
    });

    // This aims to prevent this issue: https://inxt.atlassian.net/browse/PB-1446
    await AsyncUtils.sleep(500);
    res.status(201).send(XMLUtils.toWebDavXML({}, {}));
  };
}
