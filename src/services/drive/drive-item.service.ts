import { DriveItemRepository } from '../database/drive-item/drive-item.repository';
import { DriveFileItem, DriveFolderItem } from '../../types/drive.types';
import { NotFoundError } from '../../utils/errors.utils';
import { logger } from '../../utils/logger.utils';
import { DriveFileService } from './drive-file.service';
import { DriveFolderService } from './drive-folder.service';
import { DriveItemBD } from '../database/drive-item/drive-item.domain';

export class DriveItemService {
  static readonly instance = new DriveItemService();

  private readonly tryGetFileByUuid = async (cached: DriveItemBD, path: string): Promise<DriveFileItem | undefined> => {
    try {
      const item = await DriveFileService.instance.getFileMetadata(cached.uuid);
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
  };

  private readonly tryGetFolderByUuid = async (
    cached: DriveItemBD,
    path: string,
  ): Promise<DriveFolderItem | undefined> => {
    try {
      const item = await DriveFolderService.instance.getFolderMetaByUuid(cached.uuid);
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
  };

  public getFileByPath = async (path: string): Promise<DriveFileItem> => {
    const cached = await DriveItemRepository.instance.getByPath(path);

    if (cached) {
      const item = await this.tryGetFileByUuid(cached, path);
      if (item) return item;
    }

    try {
      const item = await DriveFileService.instance.getFileMetadataByPath(path);
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
      const item = await this.tryGetFolderByUuid(cached, path);
      if (item) return item;
    }

    try {
      const item = await DriveFolderService.instance.getFolderMetaByPath(path);
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
