import { DriveItemRepository } from '../database/drive-item/drive-item.repository';
import { DriveFileItem, DriveFolderItem } from '../../types/drive.types';
import { ErrorUtils } from '../../utils/errors.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { DriveFileService } from './drive-file.service';
import { DriveFolderService } from './drive-folder.service';
import { DriveItemBD } from '../database/drive-item/drive-item.domain';

export class DriveItemService {
  static readonly instance = new DriveItemService();

  /** Only drop the cached uuid when the API confirms the item is gone; evicting on a timeout
   * pushes every later request onto the slow path lookup. */
  private readonly dropCacheIfGone = async (uuid: string, error: unknown): Promise<void> => {
    if (!ErrorUtils.isNotFoundError(error)) return;
    await DriveItemRepository.instance.delete([uuid]);
  };

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
    } catch (error) {
      webdavLogger.warn(ErrorUtils.withRequestId('File metadata by uuid failed, falling back to path lookup', error), {
        path,
        uuid: cached.uuid,
      });
      await this.dropCacheIfGone(cached.uuid, error);
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
    } catch (error) {
      webdavLogger.warn(
        ErrorUtils.withRequestId('Folder metadata by uuid failed, falling back to path lookup', error),
        { path, uuid: cached.uuid },
      );
      await this.dropCacheIfGone(cached.uuid, error);
    }
  };

  public getFileByPath = async (path: string): Promise<DriveFileItem> => {
    const cached = await DriveItemRepository.instance.getByPath(path);

    if (cached?.type === 'file') {
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
    } catch (error) {
      ErrorUtils.logIfUnexpected(webdavLogger, 'File lookup by path failed', error, { path });
      throw ErrorUtils.toLookupError('file', path, error);
    }
  };

  public getFolderByPath = async (path: string): Promise<DriveFolderItem> => {
    const cached = await DriveItemRepository.instance.getByPath(path);

    if (cached?.type === 'folder') {
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
    } catch (error) {
      ErrorUtils.logIfUnexpected(webdavLogger, 'Folder lookup by path failed', error, { path });
      throw ErrorUtils.toLookupError('folder', path, error);
    }
  };
}
