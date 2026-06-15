import { describe, expect, it, vi } from 'vitest';
import { DriveItemService } from '../../../src/services/drive/drive-item.service';
import { DriveItemRepository } from '../../../src/services/database/drive-item/drive-item.repository';
import { DriveItem } from '../../../src/services/database/drive-item/drive-item.domain';
import { SdkManager } from '../../../src/services/sdk-manager.service';
import { DriveUtils } from '../../../src/utils/drive.utils';
import { newFileItem, newFileMeta, newFolderItem, newFolderMeta } from '../../fixtures/drive.fixture';
import { FileStatus } from '@internxt/sdk/dist/drive/storage/types';

type StorageType = ReturnType<typeof SdkManager.instance.getStorage>;

describe('DriveItemService', () => {
  const sut = DriveItemService.instance;

  describe('getFileByPath', () => {
    it('should return file from cache when cached and API succeeds', async () => {
      const path = '/test/file.txt';
      const cachedItem = new DriveItem({
        uuid: 'cached-uuid',
        path,
        type: 'file',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(cachedItem);

      const fileMeta = newFileMeta({ uuid: 'cached-uuid', status: FileStatus.EXISTS });
      vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue({
        getFile: vi.fn().mockReturnValue([Promise.resolve(fileMeta)]),
      } as unknown as StorageType);

      const expectedItem = newFileItem({ uuid: 'cached-uuid' });
      const createOrUpdateSpy = vi.spyOn(DriveItemRepository.instance, 'createOrUpdate').mockResolvedValue(undefined);
      vi.spyOn(DriveUtils, 'driveFileMetaToItem').mockReturnValue(expectedItem);

      const result = await sut.getFileByPath(path);

      expect(result).toBe(expectedItem);
      expect(createOrUpdateSpy).toHaveBeenCalled();
    });

    it('should throw NotFoundError when cached file status is not EXISTS', async () => {
      const path = '/test/file.txt';
      const cachedItem = new DriveItem({
        uuid: 'cached-uuid',
        path,
        type: 'file',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(cachedItem);

      const fileMeta = newFileMeta({ uuid: 'cached-uuid', status: FileStatus.TRASHED });
      vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue({
        getFile: vi.fn().mockReturnValue([Promise.resolve(fileMeta)]),
      } as unknown as StorageType);

      const deleteSpy = vi.spyOn(DriveItemRepository.instance, 'delete').mockResolvedValue(undefined);

      await expect(sut.getFileByPath(path)).rejects.toThrow('File not found at path');
      expect(deleteSpy).toHaveBeenCalledWith(['cached-uuid']);
    });

    it('should fallback to path lookup when cached API call throws and path succeeds', async () => {
      const path = '/test/file.txt';
      const cachedItem = new DriveItem({
        uuid: 'cached-uuid',
        path,
        type: 'file',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(cachedItem);

      const getStorageSpy = vi.spyOn(SdkManager.instance, 'getStorage');
      getStorageSpy.mockReturnValueOnce({
        getFile: vi.fn().mockReturnValue([Promise.reject(new Error('API error'))]),
      } as unknown as StorageType);

      const pathFileMeta = newFileMeta({ uuid: 'resolved-uuid', status: FileStatus.EXISTS });
      getStorageSpy.mockReturnValueOnce({
        getFileByPath: vi.fn().mockResolvedValue(pathFileMeta),
      } as unknown as StorageType);

      const expectedItem = newFileItem({ uuid: 'resolved-uuid' });
      const createOrUpdateSpy = vi.spyOn(DriveItemRepository.instance, 'createOrUpdate').mockResolvedValue(undefined);
      const deleteSpy = vi.spyOn(DriveItemRepository.instance, 'delete').mockResolvedValue(undefined);
      vi.spyOn(DriveUtils, 'driveFileMetaToItem').mockReturnValue(expectedItem);

      const result = await sut.getFileByPath(path);

      expect(result).toBe(expectedItem);
      expect(deleteSpy).toHaveBeenCalledWith(['cached-uuid']);
      expect(createOrUpdateSpy).toHaveBeenCalled();
    });

    it('should throw NotFoundError when cache and fallback both fail', async () => {
      const path = '/test/file.txt';
      const cachedItem = new DriveItem({
        uuid: 'cached-uuid',
        path,
        type: 'file',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(cachedItem);

      const getStorageSpy = vi.spyOn(SdkManager.instance, 'getStorage');
      getStorageSpy.mockReturnValueOnce({
        getFile: vi.fn().mockReturnValue([Promise.reject(new Error('API error'))]),
      } as unknown as StorageType);
      getStorageSpy.mockReturnValueOnce({
        getFileByPath: vi.fn().mockRejectedValue(new Error('Not found')),
      } as unknown as StorageType);

      await expect(sut.getFileByPath(path)).rejects.toThrow('File not found at path');
    });

    it('should cache and return file from path lookup when no cache exists', async () => {
      const path = '/test/file.txt';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);

      const fileMeta = newFileMeta({ uuid: 'new-uuid', status: FileStatus.EXISTS });
      vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue({
        getFileByPath: vi.fn().mockResolvedValue(fileMeta),
      } as unknown as StorageType);

      const expectedItem = newFileItem({ uuid: 'new-uuid' });
      const createOrUpdateSpy = vi.spyOn(DriveItemRepository.instance, 'createOrUpdate').mockResolvedValue(undefined);
      vi.spyOn(DriveUtils, 'driveFileMetaToItem').mockReturnValue(expectedItem);

      const result = await sut.getFileByPath(path);

      expect(result).toBe(expectedItem);
      expect(createOrUpdateSpy).toHaveBeenCalled();
    });

    it('should throw NotFoundError when path lookup fails with no cache', async () => {
      const path = '/test/nonexistent.txt';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);

      vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue({
        getFileByPath: vi.fn().mockRejectedValue(new Error('Not found')),
      } as unknown as StorageType);

      await expect(sut.getFileByPath(path)).rejects.toThrow('File not found at path');
    });

    it('should throw NotFoundError when path lookup returns non-EXISTS status', async () => {
      const path = '/test/file.txt';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);

      const fileMeta = newFileMeta({ status: FileStatus.TRASHED });
      vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue({
        getFileByPath: vi.fn().mockResolvedValue(fileMeta),
      } as unknown as StorageType);

      await expect(sut.getFileByPath(path)).rejects.toThrow('File not found at path');
    });
  });

  describe('getFolderByPath', () => {
    it('should return folder from cache when cached and API succeeds', async () => {
      const path = '/test/folder/';
      const cachedItem = new DriveItem({
        uuid: 'cached-uuid',
        path,
        type: 'folder',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(cachedItem);

      const folderMeta = newFolderMeta({ uuid: 'cached-uuid', deleted: false, removed: false });
      vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue({
        getFolderMeta: vi.fn().mockResolvedValue(folderMeta),
      } as unknown as StorageType);

      const expectedItem = newFolderItem({ uuid: 'cached-uuid' });
      const createOrUpdateSpy = vi.spyOn(DriveItemRepository.instance, 'createOrUpdate').mockResolvedValue(undefined);
      vi.spyOn(DriveUtils, 'driveFolderMetaToItem').mockReturnValue(expectedItem);

      const result = await sut.getFolderByPath(path);

      expect(result).toBe(expectedItem);
      expect(createOrUpdateSpy).toHaveBeenCalled();
    });

    it('should throw NotFoundError when cached folder status is not EXISTS', async () => {
      const path = '/test/folder/';
      const cachedItem = new DriveItem({
        uuid: 'cached-uuid',
        path,
        type: 'folder',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(cachedItem);

      vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue({
        getFolderMeta: vi.fn().mockResolvedValue(newFolderMeta({ uuid: 'cached-uuid', deleted: true })),
      } as unknown as StorageType);

      const trashedItem = newFolderItem({ uuid: 'cached-uuid', status: FileStatus.TRASHED });
      vi.spyOn(DriveUtils, 'driveFolderMetaToItem').mockReturnValue(trashedItem);

      const deleteSpy = vi.spyOn(DriveItemRepository.instance, 'delete').mockResolvedValue(undefined);

      await expect(sut.getFolderByPath(path)).rejects.toThrow('Folder not found at path');
      expect(deleteSpy).toHaveBeenCalledWith(['cached-uuid']);
    });

    it('should fallback to path lookup when cached folder API throws and path succeeds', async () => {
      const path = '/test/folder/';
      const cachedItem = new DriveItem({
        uuid: 'cached-uuid',
        path,
        type: 'folder',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(cachedItem);

      const getStorageSpy = vi.spyOn(SdkManager.instance, 'getStorage');
      getStorageSpy.mockReturnValueOnce({
        getFolderMeta: vi.fn().mockRejectedValue(new Error('API error')),
      } as unknown as StorageType);

      const pathFolderMeta = newFolderMeta({ uuid: 'resolved-uuid', deleted: false, removed: false });
      getStorageSpy.mockReturnValueOnce({
        getFolderByPath: vi.fn().mockResolvedValue(pathFolderMeta),
      } as unknown as StorageType);

      const expectedItem = newFolderItem({ uuid: 'resolved-uuid' });
      const createOrUpdateSpy = vi.spyOn(DriveItemRepository.instance, 'createOrUpdate').mockResolvedValue(undefined);
      const deleteSpy = vi.spyOn(DriveItemRepository.instance, 'delete').mockResolvedValue(undefined);
      vi.spyOn(DriveUtils, 'driveFolderMetaToItem').mockReturnValue(expectedItem);

      const result = await sut.getFolderByPath(path);

      expect(result).toBe(expectedItem);
      expect(deleteSpy).toHaveBeenCalledWith(['cached-uuid']);
      expect(createOrUpdateSpy).toHaveBeenCalled();
    });

    it('should throw NotFoundError when folder cache and fallback both fail', async () => {
      const path = '/test/folder/';
      const cachedItem = new DriveItem({
        uuid: 'cached-uuid',
        path,
        type: 'folder',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(cachedItem);

      const getStorageSpy = vi.spyOn(SdkManager.instance, 'getStorage');
      getStorageSpy.mockReturnValueOnce({
        getFolderMeta: vi.fn().mockRejectedValue(new Error('API error')),
      } as unknown as StorageType);
      getStorageSpy.mockReturnValueOnce({
        getFolderByPath: vi.fn().mockRejectedValue(new Error('Not found')),
      } as unknown as StorageType);

      await expect(sut.getFolderByPath(path)).rejects.toThrow('Folder not found at path');
    });

    it('should cache and return folder from path lookup when no cache exists', async () => {
      const path = '/test/folder/';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);

      const folderMeta = newFolderMeta({ uuid: 'new-uuid', deleted: false, removed: false });
      vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue({
        getFolderByPath: vi.fn().mockResolvedValue(folderMeta),
      } as unknown as StorageType);

      const expectedItem = newFolderItem({ uuid: 'new-uuid' });
      const createOrUpdateSpy = vi.spyOn(DriveItemRepository.instance, 'createOrUpdate').mockResolvedValue(undefined);
      vi.spyOn(DriveUtils, 'driveFolderMetaToItem').mockReturnValue(expectedItem);

      const result = await sut.getFolderByPath(path);

      expect(result).toBe(expectedItem);
      expect(createOrUpdateSpy).toHaveBeenCalled();
    });

    it('should throw NotFoundError when folder path lookup fails with no cache', async () => {
      const path = '/test/nonexistent/';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);

      vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue({
        getFolderByPath: vi.fn().mockRejectedValue(new Error('Not found')),
      } as unknown as StorageType);

      await expect(sut.getFolderByPath(path)).rejects.toThrow('Folder not found at path');
    });

    it('should throw NotFoundError when folder path lookup returns non-EXISTS status', async () => {
      const path = '/test/folder/';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);

      const folderMeta = newFolderMeta({ deleted: true });
      vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue({
        getFolderByPath: vi.fn().mockResolvedValue(folderMeta),
      } as unknown as StorageType);

      const trashedItem = newFolderItem({ status: FileStatus.TRASHED });
      vi.spyOn(DriveUtils, 'driveFolderMetaToItem').mockReturnValue(trashedItem);

      await expect(sut.getFolderByPath(path)).rejects.toThrow('Folder not found at path');
    });
  });
});
