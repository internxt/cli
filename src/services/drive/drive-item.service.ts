import { DriveItemRepository } from '../database/drive-item/drive-item.repository';
import { DriveFileItem, DriveFolderItem } from '../../types/drive.types';
import { BadGatewayError, ErrorUtils, NotFoundError, ServiceUnavailableError } from '../../utils/errors.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { DriveFileService } from './drive-file.service';
import { DriveFolderService } from './drive-folder.service';
import { DriveItemBD } from '../database/drive-item/drive-item.domain';
import { AsyncUtils } from '../../utils/async.utils';

const LOOKUP_RETRY_DELAYS_MS = [400, 1200];
const LOOKUP_RETRY_BUDGET_MS = 5000;

const withJitter = (delayMs: number): number => Math.round(delayMs * (0.75 + Math.random() * 0.5));

export class DriveItemService {
  static readonly instance = new DriveItemService();

  /** Only drop the cached uuid when the API confirms the item is gone; evicting on a timeout
   * pushes every later request onto the slow path lookup. */
  private readonly dropCacheIfGone = async (uuid: string, error: unknown): Promise<void> => {
    if (!ErrorUtils.isNotFoundError(error)) return;
    await DriveItemRepository.instance.delete([uuid]);
  };

  private readonly asLookupError = (itemType: 'File' | 'Folder', path: string, error: unknown): Error => {
    switch (ErrorUtils.classifyLookupError(error)) {
      case 'auth':
        return new BadGatewayError(
          ErrorUtils.withRequestId(
            `The Internxt API rejected this session while looking up ${path}, log in again with 'internxt login'`,
            error,
          ),
        );
      case 'inconclusive':
        return new ServiceUnavailableError(
          ErrorUtils.withRequestId(`${itemType} lookup at path ${path} could not be completed, retry later`, error),
        );
      case 'not-found':
        return new NotFoundError(`${itemType} not found at path: ${path}`);
    }
  };

  /** Metadata reads are side effect free, so a transient failure is replayed until the attempts
   * or the time budget run out. */
  private readonly retryOnTransientFailure = async <T>(
    operation: () => Promise<T>,
    deadline: number,
    meta: { description: string; path: string },
  ): Promise<T> => {
    for (let attempt = 0; ; attempt++) {
      try {
        return await operation();
      } catch (error) {
        const delay = LOOKUP_RETRY_DELAYS_MS[attempt];
        if (delay === undefined || !ErrorUtils.isRetryableLookupError(error)) throw error;

        const waitMs = withJitter(delay);
        if (Date.now() + waitMs >= deadline) throw error;

        webdavLogger.warn(ErrorUtils.withRequestId(`${meta.description} failed, retrying in ${waitMs}ms`, error), {
          path: meta.path,
          attempt: attempt + 1,
        });
        await AsyncUtils.sleep(waitMs);
      }
    }
  };

  private readonly tryGetFileByUuid = async (
    cached: DriveItemBD,
    path: string,
    deadline: number,
  ): Promise<DriveFileItem | undefined> => {
    try {
      const item = await this.retryOnTransientFailure(
        () => DriveFileService.instance.getFileMetadata(cached.uuid),
        deadline,
        { description: 'File metadata by uuid', path },
      );
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
    deadline: number,
  ): Promise<DriveFolderItem | undefined> => {
    try {
      const item = await this.retryOnTransientFailure(
        () => DriveFolderService.instance.getFolderMetaByUuid(cached.uuid),
        deadline,
        { description: 'Folder metadata by uuid', path },
      );
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
    const deadline = Date.now() + LOOKUP_RETRY_BUDGET_MS;

    if (cached?.type === 'file') {
      const item = await this.tryGetFileByUuid(cached, path, deadline);
      if (item) return item;
    }

    try {
      const item = await this.retryOnTransientFailure(
        () => DriveFileService.instance.getFileMetadataByPath(path),
        deadline,
        { description: 'File lookup by path', path },
      );
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
      throw this.asLookupError('File', path, error);
    }
  };

  public getFolderByPath = async (path: string): Promise<DriveFolderItem> => {
    const cached = await DriveItemRepository.instance.getByPath(path);
    const deadline = Date.now() + LOOKUP_RETRY_BUDGET_MS;

    if (cached?.type === 'folder') {
      const item = await this.tryGetFolderByUuid(cached, path, deadline);
      if (item) return item;
    }

    try {
      const item = await this.retryOnTransientFailure(
        () => DriveFolderService.instance.getFolderMetaByPath(path),
        deadline,
        { description: 'Folder lookup by path', path },
      );
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
      throw this.asLookupError('Folder', path, error);
    }
  };
}
