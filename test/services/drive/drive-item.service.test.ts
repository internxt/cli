import { describe, expect, test, vi } from 'vitest';
import { DriveItemService } from '../../../src/services/drive/drive-item.service';
import { DriveItemRepository } from '../../../src/services/database/drive-item/drive-item.repository';
import { DriveItemBD } from '../../../src/services/database/drive-item/drive-item.domain';
import { DriveFileService } from '../../../src/services/drive/drive-file.service';
import { DriveFolderService } from '../../../src/services/drive/drive-folder.service';
import { newFileItem, newFolderItem } from '../../fixtures/drive.fixture';
import { NotFoundError } from '../../../src/utils/errors.utils';

describe('Drive Item Service', () => {
  const sut = DriveItemService.instance;

  describe('getting a file by path', () => {
    test('when the file is in cache and the API responds, then the cached file is returned', async () => {
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

    test('when the cached file is no longer available on the server, then a not found error is thrown', async () => {
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

    test('when the cached lookup fails but the path lookup succeeds, then the file is resolved via the path', async () => {
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

    test('when both cache and path lookup fail, then a not found error is thrown', async () => {
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

    test('when there is no cached file and the path lookup succeeds, then the file is cached and returned', async () => {
      const path = '/test/file.txt';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);

      const expectedItem = newFileItem({ uuid: 'new-uuid' });
      vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockResolvedValue(expectedItem);
      const createOrUpdateSpy = vi.spyOn(DriveItemRepository.instance, 'createOrUpdate').mockResolvedValue(undefined);

      const result = await sut.getFileByPath(path);

      expect(result).toBe(expectedItem);
      expect(createOrUpdateSpy).toHaveBeenCalled();
    });

    test('when there is no cache and the path lookup fails, then a not found error is thrown', async () => {
      const path = '/test/nonexistent.txt';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);
      vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockRejectedValue(new Error('Not found'));

      await expect(sut.getFileByPath(path)).rejects.toThrow('File not found at path');
    });

    test('when the path lookup returns a non-existing status, then a not found error is thrown', async () => {
      const path = '/test/file.txt';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);
      vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockRejectedValue(
        new NotFoundError('File with path /test/file.txt not found'),
      );

      await expect(sut.getFileByPath(path)).rejects.toThrow('File not found at path');
    });
  });

  describe('getting a folder by path', () => {
    test('when the folder is in cache and the API responds, then the cached folder is returned', async () => {
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

    test('when the cached folder is no longer available on the server, then a not found error is thrown', async () => {
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

    test('when the cached lookup fails but the path lookup succeeds, then the folder is resolved via the path', async () => {
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

    test('when both cache and path lookup fail, then a not found error is thrown', async () => {
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

    test('when there is no cached folder and the path lookup succeeds, then the folder is cached and returned', async () => {
      const path = '/test/folder/';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);

      const expectedItem = newFolderItem({ uuid: 'new-uuid' });
      vi.spyOn(DriveFolderService.instance, 'getFolderMetaByPath').mockResolvedValue(expectedItem);
      const createOrUpdateSpy = vi.spyOn(DriveItemRepository.instance, 'createOrUpdate').mockResolvedValue(undefined);

      const result = await sut.getFolderByPath(path);

      expect(result).toBe(expectedItem);
      expect(createOrUpdateSpy).toHaveBeenCalled();
    });

    test('when there is no cache and the path lookup fails, then a not found error is thrown', async () => {
      const path = '/test/nonexistent/';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);
      vi.spyOn(DriveFolderService.instance, 'getFolderMetaByPath').mockRejectedValue(new Error('Not found'));

      await expect(sut.getFolderByPath(path)).rejects.toThrow('Folder not found at path');
    });

    test('when the path lookup returns a non-existing status, then a not found error is thrown', async () => {
      const path = '/test/folder/';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);
      vi.spyOn(DriveFolderService.instance, 'getFolderMetaByPath').mockRejectedValue(
        new NotFoundError('Folder with uuid some-uuid not found at path: ' + path),
      );

      await expect(sut.getFolderByPath(path)).rejects.toThrow('Folder not found at path');
    });
  });
});
