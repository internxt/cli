import { beforeEach, describe, expect, test, onTestFinished, vi } from 'vitest';
import { DriveFolderService } from '../../../../src/services/drive/drive-folder.service';
import { UploadFolderService } from '../../../../src/services/network/upload/upload-folder.service';
import { logger } from '../../../../src/utils/logger.utils';
import { ErrorUtils } from '../../../../src/utils/errors.utils';
import { createFileSystemNodeFixture, createProgressFixtures } from './upload.service.helpers';
import { DELAYS_MS } from '../../../../src/services/network/upload/upload.types';

describe('Upload Folder Service', () => {
  let sut: UploadFolderService;

  beforeEach(() => {
    sut = UploadFolderService.instance;
    vi.spyOn(DriveFolderService.instance, 'createFolder').mockReturnValue([
      Promise.resolve({ uuid: 'mock-folder-uuid' }),
    ] as unknown as ReturnType<typeof DriveFolderService.instance.createFolder>);
    vi.spyOn(ErrorUtils, 'isAlreadyExistsError').mockReturnValue(false);
  });

  describe('creating multiple folders', () => {
    const destinationFolderUuid = 'dest-uuid';

    test('when folders are created, then a mapping of paths to identifiers is returned', async () => {
      const { currentProgress, emitProgress } = createProgressFixtures();
      vi.spyOn(DriveFolderService.instance, 'createFolder')
        .mockReturnValueOnce([Promise.resolve({ uuid: 'root-uuid' })] as unknown as ReturnType<
          typeof DriveFolderService.instance.createFolder
        >)
        .mockReturnValueOnce([Promise.resolve({ uuid: 'subfolder-uuid' })] as unknown as ReturnType<
          typeof DriveFolderService.instance.createFolder
        >);

      const result = await sut.createFolders({
        foldersToCreate: [
          createFileSystemNodeFixture({ type: 'folder', name: 'root', relativePath: 'root' }),
          createFileSystemNodeFixture({ type: 'folder', name: 'subfolder', relativePath: 'root/subfolder' }),
        ],
        destinationFolderUuid,
        currentProgress,
        emitProgress,
        reporter: vi.fn(),
        debugMode: true,
      });

      expect(result.size).toBe(2);
      expect(result.get('root')).toBe('root-uuid');
      expect(result.get('root/subfolder')).toBe('subfolder-uuid');
    });

    test('when a folder has no known parent, then it is skipped', async () => {
      const { currentProgress, emitProgress } = createProgressFixtures();

      const result = await sut.createFolders({
        foldersToCreate: [
          createFileSystemNodeFixture({ type: 'folder', name: 'orphan', relativePath: 'nonexistent/orphan' }),
        ],
        destinationFolderUuid,
        currentProgress,
        emitProgress,
        reporter: vi.fn(),
        debugMode: true,
      });

      expect(result.size).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith('Parent folder not found for nonexistent/orphan, skipping...');
      expect(DriveFolderService.instance.createFolder).not.toHaveBeenCalled();
    });

    test('when creating a top-level folder, then the destination folder is set as its parent', async () => {
      const { currentProgress, emitProgress } = createProgressFixtures();

      await sut.createFolders({
        foldersToCreate: [createFileSystemNodeFixture({ type: 'folder', name: 'root', relativePath: 'root' })],
        destinationFolderUuid,
        currentProgress,
        emitProgress,
        reporter: vi.fn(),
        debugMode: true,
      });

      expect(DriveFolderService.instance.createFolder).toHaveBeenCalledWith({
        plainName: 'root',
        parentFolderUuid: destinationFolderUuid,
      });
    });

    test('when a folder is created successfully, then the progress is updated', async () => {
      const { currentProgress, emitProgress } = createProgressFixtures();

      await sut.createFolders({
        foldersToCreate: [createFileSystemNodeFixture({ type: 'folder', name: 'root', relativePath: 'root' })],
        destinationFolderUuid,
        currentProgress,
        emitProgress,
        reporter: vi.fn(),
        debugMode: true,
      });

      expect(currentProgress.itemsUploaded).toBe(1);
      expect(emitProgress).toHaveBeenCalledTimes(1);
    });
  });

  describe('creating a folder with retry', () => {
    const folderName = 'test-folder';
    const parentFolderUuid = 'parent-uuid';

    test('when a folder is created, then its identifier is returned', async () => {
      vi.spyOn(DriveFolderService.instance, 'createFolder').mockReturnValueOnce([
        Promise.resolve({ uuid: 'created-folder-uuid' }),
      ] as unknown as ReturnType<typeof DriveFolderService.instance.createFolder>);

      const result = await sut.createFolderWithRetry({
        folderName,
        parentFolderUuid,
        reporter: vi.fn(),
        debugMode: true,
      });

      expect(result).toBe('created-folder-uuid');
      expect(DriveFolderService.instance.createFolder).toHaveBeenCalledWith({
        plainName: folderName,
        parentFolderUuid,
      });
    });

    test('when the folder already exists, then null is returned', async () => {
      const alreadyExistsError = new Error('Folder already exists');
      vi.spyOn(ErrorUtils, 'isAlreadyExistsError').mockReturnValue(true);
      vi.spyOn(DriveFolderService.instance, 'createFolder').mockRejectedValue(alreadyExistsError);

      const result = await sut.createFolderWithRetry({
        folderName,
        parentFolderUuid,
        reporter: vi.fn(),
        debugMode: true,
      });

      expect(result).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(`Folder ${folderName} already exists, skipping...`);
    });

    test('when a transient error occurs during creation, then up to three retries are attempted', async () => {
      vi.useFakeTimers();
      const transientError = new Error('Network error');

      // Create promises with catch handlers to prevent unhandled rejections
      const rejection1 = Promise.reject(transientError).catch(() => {});
      const rejection2 = Promise.reject(transientError).catch(() => {});

      vi.spyOn(DriveFolderService.instance, 'createFolder')
        .mockReturnValueOnce([rejection1] as unknown as ReturnType<typeof DriveFolderService.instance.createFolder>)
        .mockReturnValueOnce([rejection2] as unknown as ReturnType<typeof DriveFolderService.instance.createFolder>)
        .mockReturnValueOnce([Promise.resolve({ uuid: 'success-uuid' })] as unknown as ReturnType<
          typeof DriveFolderService.instance.createFolder
        >);

      const reporter = vi.fn();

      const resultPromise = sut.createFolderWithRetry({
        folderName,
        parentFolderUuid,
        reporter,
        debugMode: true,
      });

      await vi.advanceTimersByTimeAsync(DELAYS_MS[0]);
      await vi.advanceTimersByTimeAsync(DELAYS_MS[1]);

      const result = await resultPromise;

      expect(result).toBe('success-uuid');
      expect(DriveFolderService.instance.createFolder).toHaveBeenCalledTimes(3);
      expect(reporter).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    test('when all creation attempts fail, then the error is thrown', async () => {
      const unhandledRejectionListener = vi.fn();
      process.on('unhandledRejection', unhandledRejectionListener);
      onTestFinished(() => {
        process.off('unhandledRejection', unhandledRejectionListener);
      });
      vi.useFakeTimers();
      vi.spyOn(DriveFolderService.instance, 'createFolder').mockImplementation(() => {
        return [Promise.reject(new Error('Persistent network error'))] as unknown as ReturnType<
          typeof DriveFolderService.instance.createFolder
        >;
      });
      const reporter = vi.fn();

      const resultPromise = sut.createFolderWithRetry({
        folderName,
        parentFolderUuid,
        reporter,
        debugMode: true,
      });
      await vi.advanceTimersByTimeAsync(DELAYS_MS[0]);
      await vi.advanceTimersByTimeAsync(DELAYS_MS[1]);
      await expect(resultPromise).rejects.toThrow('Persistent network error');
      expect(DriveFolderService.instance.createFolder).toHaveBeenCalledTimes(3);
      expect(reporter).toHaveBeenCalledTimes(3);
      expect(reporter).toHaveBeenLastCalledWith(
        expect.stringContaining(`Error: Failed to create folder '${folderName}' after 3 attempts`),
      );

      vi.useRealTimers();
    });
  });
});
