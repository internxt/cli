import { DriveDatabaseManager } from '../../services/database/drive-database-manager.service';
import { WebDavMethodHandler } from '../../types/webdav.types';
import { Request, Response } from 'express';
import { WebDavUtils } from '../../utils/webdav.utils';
import { ConflictError } from '../../utils/errors.utils';
import { DriveFolderService } from '../../services/drive/drive-folder.service';
import { webdavLogger } from '../../utils/logger.utils';
import { XMLUtils } from '../../utils/xml.utils';
import { AsyncUtils } from '../../utils/async.utils';
import { DriveFolderItem } from '../../types/drive.types';

export class MKCOLRequestHandler implements WebDavMethodHandler {
  constructor(
    private dependencies: {
      driveDatabaseManager: DriveDatabaseManager;
      driveFolderService: DriveFolderService;
    },
  ) {}

  handle = async (req: Request, res: Response) => {
    const { driveDatabaseManager, driveFolderService } = this.dependencies;
    const resource = await WebDavUtils.getRequestedResource(req);
    webdavLogger.info('Resource received for MKCOL request', { resource });

    const parentResource = await WebDavUtils.getRequestedResource(resource.parentPath);

    const parentFolderItem = (await WebDavUtils.getAndSearchItemFromResource({
      resource: parentResource,
      driveDatabaseManager,
      driveFolderService,
    })) as DriveFolderItem;

    if (!parentFolderItem) {
      throw new ConflictError(`Parent resource not found for parent path ${resource.parentPath}`);
    }

    const [createFolder] = driveFolderService.createFolder({
      folderName: resource.name,
      parentFolderId: parentFolderItem.id,
    });

    const newFolder = await createFolder;

    webdavLogger.info(`✅ Folder created with UUID ${newFolder.uuid}`);

    await driveDatabaseManager.createFolder(
      {
        name: newFolder.plain_name,
        status: 'EXISTS',
        encryptedName: newFolder.name,
        bucket: newFolder.bucket,
        id: newFolder.id,
        parentId: newFolder.parentId,
        parentUuid: newFolder.parentUuid,
        uuid: newFolder.uuid,
        createdAt: new Date(newFolder.createdAt),
        updatedAt: new Date(newFolder.updatedAt),
      },
      resource.url,
    );

    // This aims to prevent this issue: https://inxt.atlassian.net/browse/PB-1446
    await AsyncUtils.sleep(500);
    res.status(201).send(XMLUtils.toWebDavXML({}, {}));
  };
}
