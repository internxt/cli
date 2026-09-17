import { describe, expect, test, vi } from 'vitest';
import { DriveItemService } from '../../../src/services/drive/drive-item.service';
import { DriveItemRepository } from '../../../src/services/database/drive-item/drive-item.repository';
import { DriveItemBD } from '../../../src/services/database/drive-item/drive-item.domain';
import { DriveFileService } from '../../../src/services/drive/drive-file.service';
import { DriveFolderService } from '../../../src/services/drive/drive-folder.service';
import { newFileItem, newFolderItem } from '../../fixtures/drive.fixture';
import { BadGatewayError, NotFoundError, ServiceUnavailableError } from '../../../src/utils/errors.utils';
import { webdavLogger } from '../../../src/utils/logger.utils';
import { newApiError } from '../../fixtures/errors.fixture';

describe('Drive Item Service', () => {
  const sut = DriveItemService.instance;

  describe('getting a file by path', () => {
    test('when the path lookup fails with an unexpected API error, then it is logged with its request id', async () => {
      const path = '/test/file.txt';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);
      vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockRejectedValue(
        newApiError(500, { requestId: 'req-123' }),
      );

      await expect(sut.getFileByPath(path)).rejects.toBeInstanceOf(ServiceUnavailableError);
      expect(webdavLogger.warn).toHaveBeenCalledWith(
        'File lookup by path failed: Request failed with status code 500 (requestId: req-123)',
        { path },
      );
    });

    test('when the path lookup times out, then a retryable error is thrown instead of a not found', async () => {
      const path = '/test/file.txt';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);
      vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockRejectedValue(newApiError(408));

      await expect(sut.getFileByPath(path)).rejects.toMatchObject({ statusCode: 503, retryAfter: expect.any(Number) });
    });

    test('when the path lookup fails with a network error, then a retryable error is thrown', async () => {
      const path = '/test/file.txt';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);
      vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockRejectedValue(new Error('socket hang up'));

      await expect(sut.getFileByPath(path)).rejects.toBeInstanceOf(ServiceUnavailableError);
    });

    test('when the API rejects the session, then a non-retryable gateway error is thrown', async () => {
      const path = '/test/file.txt';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);
      vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockRejectedValue(
        newApiError(401, { requestId: 'req-401' }),
      );

      await expect(sut.getFileByPath(path)).rejects.toBeInstanceOf(BadGatewayError);
    });

    test('when the API rejects the path itself, then a not found error is thrown', async () => {
      const path = '/test/file.txt';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);
      vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockRejectedValue(
        newApiError(400, { requestId: 'req-400' }),
      );

      await expect(sut.getFileByPath(path)).rejects.toBeInstanceOf(NotFoundError);
    });

    test('when the cached lookup fails transiently, then the cache entry is kept', async () => {
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
        newApiError(504, { requestId: 'req-504' }),
      );
      vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockRejectedValue(
        newApiError(504, { requestId: 'req-504' }),
      );
      const deleteSpy = vi.spyOn(DriveItemRepository.instance, 'delete').mockResolvedValue(undefined);

      await expect(sut.getFileByPath(path)).rejects.toBeInstanceOf(ServiceUnavailableError);
      expect(deleteSpy).not.toHaveBeenCalled();
    });

    test('when the path lookup fails because the file does not exist, then nothing is logged', async () => {
      const path = '/test/file.txt';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);
      vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockRejectedValue(
        newApiError(404, { requestId: 'req-404' }),
      );

      await expect(sut.getFileByPath(path)).rejects.toThrow('File not found at path');
      expect(webdavLogger.warn).not.toHaveBeenCalled();
    });

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
      vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockRejectedValue(new NotFoundError('Not found'));

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

      vi.spyOn(DriveFileService.instance, 'getFileMetadata').mockRejectedValue(new NotFoundError('API error'));

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

      vi.spyOn(DriveFileService.instance, 'getFileMetadata').mockRejectedValue(new NotFoundError('API error'));
      vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockRejectedValue(new NotFoundError('Not found'));

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
      vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockRejectedValue(new NotFoundError('Not found'));

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
      vi.spyOn(DriveFolderService.instance, 'getFolderMetaByPath').mockRejectedValue(new NotFoundError('Not found'));

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

      vi.spyOn(DriveFolderService.instance, 'getFolderMetaByUuid').mockRejectedValue(new NotFoundError('API error'));

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

      vi.spyOn(DriveFolderService.instance, 'getFolderMetaByUuid').mockRejectedValue(new NotFoundError('API error'));
      vi.spyOn(DriveFolderService.instance, 'getFolderMetaByPath').mockRejectedValue(new NotFoundError('Not found'));

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
      vi.spyOn(DriveFolderService.instance, 'getFolderMetaByPath').mockRejectedValue(new NotFoundError('Not found'));

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

    test('when the path lookup times out, then a retryable error is thrown instead of a not found', async () => {
      const path = '/test/folder/';
      vi.spyOn(DriveItemRepository.instance, 'getByPath').mockResolvedValue(undefined);
      vi.spyOn(DriveFolderService.instance, 'getFolderMetaByPath').mockRejectedValue(
        newApiError(408, { requestId: 'req-408' }),
      );

      await expect(sut.getFolderByPath(path)).rejects.toMatchObject({
        statusCode: 503,
        retryAfter: expect.any(Number),
      });
    });

    test('when the cached lookup fails transiently, then the cache entry is kept', async () => {
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
        newApiError(500, { requestId: 'req-500' }),
      );
      vi.spyOn(DriveFolderService.instance, 'getFolderMetaByPath').mockRejectedValue(
        newApiError(500, { requestId: 'req-500' }),
      );
      const deleteSpy = vi.spyOn(DriveItemRepository.instance, 'delete').mockResolvedValue(undefined);

      await expect(sut.getFolderByPath(path)).rejects.toBeInstanceOf(ServiceUnavailableError);
      expect(deleteSpy).not.toHaveBeenCalled();
    });
  });
});
