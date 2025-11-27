import { beforeEach, describe, expect, it, onTestFinished, vi } from 'vitest';
import { DriveFolderService } from '../../../../src/services/drive/drive-folder.service';
import { UploadFolderService } from '../../../../src/services/network/upload/upload-folder.service';
import { logger } from '../../../../src/utils/logger.utils';
import { isAlreadyExistsError } from '../../../../src/utils/errors.utils';
import { createFileSystemNodeFixture, createProgressFixtures } from './upload.service.helpers';
import { DELAYS_MS } from '../../../../src/services/network/upload/upload.types';
vi.mock('../../../../src/services/drive/drive-folder.service', () => ({
  DriveFolderService: {
    instance: {
      createFolder: vi.fn(),
    },
  },
}));

vi.mock('../../../../src/utils/logger.utils', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../../src/utils/errors.utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../../src/utils/errors.utils')>();
  return {
    ...actual,
    isAlreadyExistsError: vi.fn(),
    ErrorUtils: {
      report: vi.fn(),
    },
  };
});

describe('UploadFolderService', () => {
  let sut: UploadFolderService;
  beforeEach(() => {
    vi.clearAllMocks();
    sut = UploadFolderService.instance;
    vi.mocked(DriveFolderService.instance.createFolder).mockReturnValue([
      Promise.resolve({ uuid: 'mock-folder-uuid' }),
    ] as unknown as ReturnType<typeof DriveFolderService.instance.createFolder>);
    vi.mocked(isAlreadyExistsError).mockReturnValue(false);
  });
  describe('createFolders', () => {
    const destinationFolderUuid = 'dest-uuid';

    it('should properly return a map of created folders where key is relativePath and value is uuid', async () => {
      const { currentProgress, emitProgress } = createProgressFixtures();
      vi.mocked(DriveFolderService.instance.createFolder)
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
      });

      expect(result.size).toBe(2);
      expect(result.get('root')).toBe('root-uuid');
      expect(result.get('root/subfolder')).toBe('subfolder-uuid');
    });

    it('should properly skip over folders that dont have a parentUuid', async () => {
      const { currentProgress, emitProgress } = createProgressFixtures();

      const result = await sut.createFolders({
        foldersToCreate: [
          createFileSystemNodeFixture({ type: 'folder', name: 'orphan', relativePath: 'nonexistent/orphan' }),
        ],
        destinationFolderUuid,
        currentProgress,
        emitProgress,
      });

      expect(result.size).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith('Parent folder not found for nonexistent/orphan, skipping...');
      expect(DriveFolderService.instance.createFolder).not.toHaveBeenCalled();
    });

    it('should properly set as parent folder the destinationFolderUuid for base folder', async () => {
      const { currentProgress, emitProgress } = createProgressFixtures();

      await sut.createFolders({
        foldersToCreate: [createFileSystemNodeFixture({ type: 'folder', name: 'root', relativePath: 'root' })],
        destinationFolderUuid,
        currentProgress,
        emitProgress,
      });

      expect(DriveFolderService.instance.createFolder).toHaveBeenCalledWith({
        plainName: 'root',
        parentFolderUuid: destinationFolderUuid,
      });
    });

    it('should properly update the progress on successful folder creation', async () => {
      const { currentProgress, emitProgress } = createProgressFixtures();

      await sut.createFolders({
        foldersToCreate: [createFileSystemNodeFixture({ type: 'folder', name: 'root', relativePath: 'root' })],
        destinationFolderUuid,
        currentProgress,
        emitProgress,
      });

      expect(currentProgress.itemsUploaded).toBe(1);
      expect(emitProgress).toHaveBeenCalledTimes(1);
    });
  });
  describe('createFolderWithRetry', () => {
    const folderName = 'test-folder';
    const parentFolderUuid = 'parent-uuid';

    it('should properly create a folder and return the created folder uuid', async () => {
      vi.mocked(DriveFolderService.instance.createFolder).mockReturnValueOnce([
        Promise.resolve({ uuid: 'created-folder-uuid' }),
      ] as unknown as ReturnType<typeof DriveFolderService.instance.createFolder>);

      const result = await sut.createFolderWithRetry({ folderName, parentFolderUuid });

      expect(result).toBe('created-folder-uuid');
      expect(DriveFolderService.instance.createFolder).toHaveBeenCalledWith({
        plainName: folderName,
        parentFolderUuid,
      });
    });

    it('should properly return null if the folder already exists', async () => {
      const alreadyExistsError = new Error('Folder already exists');
      vi.mocked(isAlreadyExistsError).mockReturnValue(true);
      vi.mocked(DriveFolderService.instance.createFolder).mockReturnValueOnce([
        Promise.reject(alreadyExistsError),
      ] as unknown as ReturnType<typeof DriveFolderService.instance.createFolder>);

      const result = await sut.createFolderWithRetry({ folderName, parentFolderUuid });

      expect(result).toBeNull();
      expect(logger.info).toHaveBeenCalledWith(`Folder ${folderName} already exists, skipping...`);
    });

    it('should properly retry up to 3 times when error caught', async () => {
      vi.useFakeTimers();
      const transientError = new Error('Network error');

      // Create promises with catch handlers to prevent unhandled rejections
      const rejection1 = Promise.reject(transientError).catch(() => {});
      const rejection2 = Promise.reject(transientError).catch(() => {});

      vi.mocked(DriveFolderService.instance.createFolder)
        .mockReturnValueOnce([rejection1] as unknown as ReturnType<typeof DriveFolderService.instance.createFolder>)
        .mockReturnValueOnce([rejection2] as unknown as ReturnType<typeof DriveFolderService.instance.createFolder>)
        .mockReturnValueOnce([Promise.resolve({ uuid: 'success-uuid' })] as unknown as ReturnType<
          typeof DriveFolderService.instance.createFolder
        >);

      const resultPromise = sut.createFolderWithRetry({ folderName, parentFolderUuid });

      await vi.advanceTimersByTimeAsync(DELAYS_MS[0]);
      await vi.advanceTimersByTimeAsync(DELAYS_MS[1]);

      const result = await resultPromise;

      expect(result).toBe('success-uuid');
      expect(DriveFolderService.instance.createFolder).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should properly throw an error when multiple unsuccessfull retries', async () => {
      const unhandledRejectionListener = vi.fn();
      process.on('unhandledRejection', unhandledRejectionListener);
      onTestFinished(() => {
        process.off('unhandledRejection', unhandledRejectionListener);
      });
      vi.useFakeTimers();
      vi.mocked(DriveFolderService.instance.createFolder).mockImplementation(() => {
        return [Promise.reject(new Error('Persistent network error'))] as unknown as ReturnType<
          typeof DriveFolderService.instance.createFolder
        >;
      });

      const resultPromise = sut.createFolderWithRetry({ folderName, parentFolderUuid });
      await vi.advanceTimersByTimeAsync(DELAYS_MS[0]);
      await vi.advanceTimersByTimeAsync(DELAYS_MS[1]);
      await expect(resultPromise).rejects.toThrow('Persistent network error');
      expect(DriveFolderService.instance.createFolder).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledTimes(2);
      expect(logger.error).toHaveBeenCalledWith(`Failed to create folder ${folderName} after 3 attempts`);

      vi.useRealTimers();
    });
  });
});
