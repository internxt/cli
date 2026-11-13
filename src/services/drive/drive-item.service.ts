import { DriveItemRepository } from '../database/drive-item/drive-item.repository';
import { DriveFileItem, DriveFolderItem } from '../../types/drive.types';
import { ErrorUtils } from '../../utils/errors.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { DriveFileService } from './drive-file.service';
import { DriveFolderService } from './drive-folder.service';
import { DriveItemBD } from '../database/drive-item/drive-item.domain';

const RECENT_WRITE_TRUST_MS = 10_000;

export class DriveItemService {
  static readonly instance = new DriveItemService();

  private readonly recentFileWrites = new Map<string, { item: DriveFileItem; expiresAt: number }>();

  /** The API reads from replicas that can lag a moment behind a write, so a file this server
   * just created can briefly look missing; remember it so that 404 is not trusted. */
  public rememberFileWrite = (path: string, item: DriveFileItem): void => {
    const now = Date.now();
    for (const [writtenPath, write] of this.recentFileWrites) {
      if (write.expiresAt <= now) this.recentFileWrites.delete(writtenPath);
    }
    this.recentFileWrites.set(path, { item, expiresAt: now + RECENT_WRITE_TRUST_MS });
  };

  /** Only while the path cache still maps to the written uuid: our own DELETE and MOVE clear it. */
  private readonly getRecentFileWrite = (
    cached: DriveItemBD | undefined,
    path: string,
    error: unknown,
  ): DriveFileItem | undefined => {
    if (!cached || !ErrorUtils.isNotFoundError(error)) return;

    const write = this.recentFileWrites.get(path);
    if (!write || write.expiresAt <= Date.now() || write.item.uuid !== cached.uuid) return;

    webdavLogger.info(`[LOOKUP] '${path}' was written moments ago, ignoring the API's not found`, {
      uuid: cached.uuid,
    });
    return write.item;
  };

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
      const recentWrite = this.getRecentFileWrite(cached, path, error);
      if (recentWrite) return recentWrite;

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
    const cached = await DriveItemRepository.instance.getByPath(path, 'file');

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
      const recentWrite = this.getRecentFileWrite(cached, path, error);
      if (recentWrite) return recentWrite;

      ErrorUtils.logIfUnexpected(webdavLogger, 'File lookup by path failed', error, { path });
      throw ErrorUtils.toLookupError('file', path, error);
    }
  };

  public getFolderByPath = async (path: string): Promise<DriveFolderItem> => {
    const cached = await DriveItemRepository.instance.getByPath(path, 'folder');

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
