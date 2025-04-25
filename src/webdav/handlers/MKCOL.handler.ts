import { DriveDatabaseManager } from '../../services/database/drive-database-manager.service';
import { WebDavMethodHandler } from '../../types/webdav.types';
import { Request, Response } from 'express';
import { WebDavUtils } from '../../utils/webdav.utils';
import { DriveFolderService } from '../../services/drive/drive-folder.service';
import { webdavLogger } from '../../utils/logger.utils';
import { XMLUtils } from '../../utils/xml.utils';
import { AsyncUtils } from '../../utils/async.utils';
import { DriveFolderItem } from '../../types/drive.types';

export class MKCOLRequestHandler implements WebDavMethodHandler {
  constructor(
    private readonly dependencies: {
      driveDatabaseManager: DriveDatabaseManager;
      driveFolderService: DriveFolderService;
    },
  ) {}

  handle = async (req: Request, res: Response) => {
    const { driveDatabaseManager, driveFolderService } = this.dependencies;
    const resource = await WebDavUtils.getRequestedResource(req);

    webdavLogger.info(`[MKCOL] Request received for ${resource.type} at ${resource.url}`);

    const parentResource = await WebDavUtils.getRequestedResource(resource.parentPath, false);

    const parentFolderItem = (await WebDavUtils.getAndSearchItemFromResource({
      resource: parentResource,
      driveDatabaseManager,
      driveFolderService,
    })) as DriveFolderItem;

    const [createFolder] = driveFolderService.createFolder({
      plainName: resource.path.base,
      parentFolderUuid: parentFolderItem.uuid,
    });

    const newFolder = await createFolder;

    webdavLogger.info(`[MKCOL] ✅ Folder created with UUID ${newFolder.uuid}`);

    await driveDatabaseManager.createFolder(
      {
        name: newFolder.plainName,
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
