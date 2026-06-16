import { describe, expect, it, vi } from 'vitest';
import { DriveItemService } from '../../../src/services/drive/drive-item.service';
import { DriveItemRepository } from '../../../src/services/database/drive-item/drive-item.repository';
import { DriveItemBD } from '../../../src/services/database/drive-item/drive-item.domain';
import { DriveFileService } from '../../../src/services/drive/drive-file.service';
import { DriveFolderService } from '../../../src/services/drive/drive-folder.service';
import { newFileItem, newFolderItem } from '../../fixtures/drive.fixture';
import { NotFoundError } from '../../../src/utils/errors.utils';

describe('DriveItemService', () => {
  const sut = DriveItemService.instance;

  describe('getFileByPath', () => {
    it('should return file from cache when cached and API succeeds', async () => {
      const path = '/test/file.txt';
      const cachedItem = new DriveItemBD({
        uuid: 'cached-uuid',
        path,
        type: 'file',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(cachedItem);

      const expectedItem = newFileItem({ uuid: 'cached-uuid' });
      vi.spyOn(DriveFileService.instance, 'getFileMetadata').mockResolvedValue(expectedItem);
      const createOrUpdateSpy = vi.spyOn(DriveItemRepository.instance, 'createOrUpdate').mockResolvedValue(undefined);

      const result = await sut.getFileByPath(path);

      expect(result).toBe(expectedItem);
      expect(createOrUpdateSpy).toHaveBeenCalled();
    });

    it('should throw NotFoundError when cached file status is not EXISTS', async () => {
      const path = '/test/file.txt';
      const cachedItem = new DriveItemBD({
        uuid: 'cached-uuid',
        path,
        type: 'file',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(cachedItem);

      vi.spyOn(DriveFileService.instance, 'getFileMetadata').mockRejectedValue(
        new NotFoundError('File with uuid cached-uuid not found'),
      );
      vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockRejectedValue(new Error('Not found'));

      const deleteSpy = vi.spyOn(DriveItemRepository.instance, 'delete').mockResolvedValue(undefined);

      await expect(sut.getFileByPath(path)).rejects.toThrow('File not found at path');
      expect(deleteSpy).toHaveBeenCalledWith(['cached-uuid']);
    });

    it('should fallback to path lookup when cached API call throws and path succeeds', async () => {
      const path = '/test/file.txt';
      const cachedItem = new DriveItemBD({
        uuid: 'cached-uuid',
        path,
        type: 'file',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(cachedItem);

      vi.spyOn(DriveFileService.instance, 'getFileMetadata').mockRejectedValue(new Error('API error'));

      const pathItem = newFileItem({ uuid: 'resolved-uuid' });
      vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockResolvedValue(pathItem);

      const createOrUpdateSpy = vi.spyOn(DriveItemRepository.instance, 'createOrUpdate').mockResolvedValue(undefined);
      const deleteSpy = vi.spyOn(DriveItemRepository.instance, 'delete').mockResolvedValue(undefined);

      const result = await sut.getFileByPath(path);

      expect(result).toBe(pathItem);
      expect(deleteSpy).toHaveBeenCalledWith(['cached-uuid']);
      expect(createOrUpdateSpy).toHaveBeenCalled();
    });

    it('should throw NotFoundError when cache and fallback both fail', async () => {
      const path = '/test/file.txt';
      const cachedItem = new DriveItemBD({
        uuid: 'cached-uuid',
        path,
        type: 'file',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(cachedItem);

      vi.spyOn(DriveFileService.instance, 'getFileMetadata').mockRejectedValue(new Error('API error'));
      vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockRejectedValue(new Error('Not found'));

      await expect(sut.getFileByPath(path)).rejects.toThrow('File not found at path');
    });

    it('should cache and return file from path lookup when no cache exists', async () => {
      const path = '/test/file.txt';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);

      const expectedItem = newFileItem({ uuid: 'new-uuid' });
      vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockResolvedValue(expectedItem);
      const createOrUpdateSpy = vi.spyOn(DriveItemRepository.instance, 'createOrUpdate').mockResolvedValue(undefined);

      const result = await sut.getFileByPath(path);

      expect(result).toBe(expectedItem);
      expect(createOrUpdateSpy).toHaveBeenCalled();
    });

    it('should throw NotFoundError when path lookup fails with no cache', async () => {
      const path = '/test/nonexistent.txt';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);
      vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockRejectedValue(new Error('Not found'));

      await expect(sut.getFileByPath(path)).rejects.toThrow('File not found at path');
    });

    it('should throw NotFoundError when path lookup returns non-EXISTS status', async () => {
      const path = '/test/file.txt';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);
      vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockRejectedValue(
        new NotFoundError('File with path /test/file.txt not found'),
      );

      await expect(sut.getFileByPath(path)).rejects.toThrow('File not found at path');
    });
  });

  describe('getFolderByPath', () => {
    it('should return folder from cache when cached and API succeeds', async () => {
      const path = '/test/folder/';
      const cachedItem = new DriveItemBD({
        uuid: 'cached-uuid',
        path,
        type: 'folder',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(cachedItem);

      const expectedItem = newFolderItem({ uuid: 'cached-uuid' });
      vi.spyOn(DriveFolderService.instance, 'getFolderMetaByUuid').mockResolvedValue(expectedItem);
      const createOrUpdateSpy = vi.spyOn(DriveItemRepository.instance, 'createOrUpdate').mockResolvedValue(undefined);

      const result = await sut.getFolderByPath(path);

      expect(result).toBe(expectedItem);
      expect(createOrUpdateSpy).toHaveBeenCalled();
    });

    it('should throw NotFoundError when cached folder status is not EXISTS', async () => {
      const path = '/test/folder/';
      const cachedItem = new DriveItemBD({
        uuid: 'cached-uuid',
        path,
        type: 'folder',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(cachedItem);

      vi.spyOn(DriveFolderService.instance, 'getFolderMetaByUuid').mockRejectedValue(
        new NotFoundError('Folder with uuid cached-uuid not found'),
      );
      vi.spyOn(DriveFolderService.instance, 'getFolderMetaByPath').mockRejectedValue(new Error('Not found'));

      const deleteSpy = vi.spyOn(DriveItemRepository.instance, 'delete').mockResolvedValue(undefined);

      await expect(sut.getFolderByPath(path)).rejects.toThrow('Folder not found at path');
      expect(deleteSpy).toHaveBeenCalledWith(['cached-uuid']);
    });

    it('should fallback to path lookup when cached folder API throws and path succeeds', async () => {
      const path = '/test/folder/';
      const cachedItem = new DriveItemBD({
        uuid: 'cached-uuid',
        path,
        type: 'folder',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(cachedItem);

      vi.spyOn(DriveFolderService.instance, 'getFolderMetaByUuid').mockRejectedValue(new Error('API error'));

      const pathItem = newFolderItem({ uuid: 'resolved-uuid' });
      vi.spyOn(DriveFolderService.instance, 'getFolderMetaByPath').mockResolvedValue(pathItem);

      const createOrUpdateSpy = vi.spyOn(DriveItemRepository.instance, 'createOrUpdate').mockResolvedValue(undefined);
      const deleteSpy = vi.spyOn(DriveItemRepository.instance, 'delete').mockResolvedValue(undefined);

      const result = await sut.getFolderByPath(path);

      expect(result).toBe(pathItem);
      expect(deleteSpy).toHaveBeenCalledWith(['cached-uuid']);
      expect(createOrUpdateSpy).toHaveBeenCalled();
    });

    it('should throw NotFoundError when folder cache and fallback both fail', async () => {
      const path = '/test/folder/';
      const cachedItem = new DriveItemBD({
        uuid: 'cached-uuid',
        path,
        type: 'folder',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(cachedItem);

      vi.spyOn(DriveFolderService.instance, 'getFolderMetaByUuid').mockRejectedValue(new Error('API error'));
      vi.spyOn(DriveFolderService.instance, 'getFolderMetaByPath').mockRejectedValue(new Error('Not found'));

      await expect(sut.getFolderByPath(path)).rejects.toThrow('Folder not found at path');
    });

    it('should cache and return folder from path lookup when no cache exists', async () => {
      const path = '/test/folder/';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);

      const expectedItem = newFolderItem({ uuid: 'new-uuid' });
      vi.spyOn(DriveFolderService.instance, 'getFolderMetaByPath').mockResolvedValue(expectedItem);
      const createOrUpdateSpy = vi.spyOn(DriveItemRepository.instance, 'createOrUpdate').mockResolvedValue(undefined);

      const result = await sut.getFolderByPath(path);

      expect(result).toBe(expectedItem);
      expect(createOrUpdateSpy).toHaveBeenCalled();
    });

    it('should throw NotFoundError when folder path lookup fails with no cache', async () => {
      const path = '/test/nonexistent/';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);
      vi.spyOn(DriveFolderService.instance, 'getFolderMetaByPath').mockRejectedValue(new Error('Not found'));

      await expect(sut.getFolderByPath(path)).rejects.toThrow('Folder not found at path');
    });

    it('should throw NotFoundError when folder path lookup returns non-EXISTS status', async () => {
      const path = '/test/folder/';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);
      vi.spyOn(DriveFolderService.instance, 'getFolderMetaByPath').mockRejectedValue(
        new NotFoundError('Folder with uuid some-uuid not found at path: ' + path),
      );

      await expect(sut.getFolderByPath(path)).rejects.toThrow('Folder not found at path');
    });
  });
});
