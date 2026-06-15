import { FileStatus } from '@internxt/sdk/dist/drive/storage/types';
import { SdkManager } from '../sdk-manager.service';
import { DriveItemRepository } from '../database/drive-item/drive-item.repository';
import { DriveUtils } from '../../utils/drive.utils';
import { DriveFileItem, DriveFolderItem } from '../../types/drive.types';
import { NotFoundError } from '../../utils/errors.utils';
import { logger } from '../../utils/logger.utils';

export class DriveItemService {
  static readonly instance = new DriveItemService();

  public getFileByPath = async (path: string): Promise<DriveFileItem> => {
    const cached = await DriveItemRepository.instance.getByPath(path);

    if (cached) {
      try {
        const storageClient = SdkManager.instance.getStorage();
        const [filePromise] = storageClient.getFile(cached.uuid);
        const fileMeta = await filePromise;

        if (fileMeta.status !== FileStatus.EXISTS) {
          throw new NotFoundError(`File with uuid ${cached.uuid} not found`);
        }

        const item = DriveUtils.driveFileMetaToItem(fileMeta);

        await DriveItemRepository.instance.createOrUpdate([
          {
            uuid: cached.uuid,
            path,
            type: 'file',
            createdAt: cached.createdAt,
            updatedAt: new Date(),
          },
        ]);

        return item;
      } catch {
        logger.warn('File metadata by uuid failed, falling back to path lookup', { path, uuid: cached.uuid });
        await DriveItemRepository.instance.delete([cached.uuid]);
      }
    }

    try {
      const storageClient = SdkManager.instance.getStorage();
      const fileMeta = await storageClient.getFileByPath(path);

      if (fileMeta.status !== FileStatus.EXISTS) {
        throw new NotFoundError(`File not found at path: ${path}`);
      }

      const item = DriveUtils.driveFileMetaToItem(fileMeta);

      await DriveItemRepository.instance.createOrUpdate([
        {
          uuid: item.uuid,
          path,
          type: 'file',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      return item;
    } catch {
      throw new NotFoundError(`File not found at path: ${path}`);
    }
  };

  public getFolderByPath = async (path: string): Promise<DriveFolderItem> => {
    const cached = await DriveItemRepository.instance.getByPath(path);

    if (cached) {
      try {
        const storageClient = SdkManager.instance.getStorage();
        const folderMeta = await storageClient.getFolderMeta(cached.uuid);
        const item = DriveUtils.driveFolderMetaToItem(folderMeta);

        if (item.status !== FileStatus.EXISTS) {
          throw new NotFoundError(`Folder with uuid ${cached.uuid} not found`);
        }

        await DriveItemRepository.instance.createOrUpdate([
          {
            uuid: cached.uuid,
            path,
            type: 'folder',
            createdAt: cached.createdAt,
            updatedAt: new Date(),
          },
        ]);

        return item;
      } catch {
        logger.warn('Folder metadata by uuid failed, falling back to path lookup', { path, uuid: cached.uuid });
        await DriveItemRepository.instance.delete([cached.uuid]);
      }
    }

    try {
      const storageClient = SdkManager.instance.getStorage();
      const folderMeta = await storageClient.getFolderByPath(path);
      const item = DriveUtils.driveFolderMetaToItem(folderMeta);

      if (item.status !== FileStatus.EXISTS) {
        throw new NotFoundError(`Folder not found at path: ${path}`);
      }

      await DriveItemRepository.instance.createOrUpdate([
        {
          uuid: item.uuid,
          path,
          type: 'folder',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      return item;
    } catch {
      throw new NotFoundError(`Folder not found at path: ${path}`);
    }
  };
}
