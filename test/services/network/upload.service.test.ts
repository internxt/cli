import { beforeEach, describe, it, vi, expect } from 'vitest';
import { UploadService } from '../../../src/services/network/upload/upload.service';
import { NetworkFacade } from '../../../src/services/network/network-facade.service';
import { DriveFolderService } from '../../../src/services/drive/drive-folder.service';
import { DriveFileService } from '../../../src/services/drive/drive-file.service';
import { logger } from '../../../src/utils/logger.utils';
import { isAlreadyExistsError } from '../../../src/utils/errors.utils';
import { stat } from 'fs/promises';
import { createReadStream } from 'fs';
import { isFileThumbnailable } from '../../../src/utils/thumbnail.utils';
import {
  createFileSystemNodeFixture,
  createMockReadStream,
  createMockStats,
  createProgressFixtures,
} from './upload.service.helpers';

vi.mock('fs', () => ({
  createReadStream: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  stat: vi.fn(),
}));

vi.mock('../../../src/services/drive/drive-file.service', () => ({
  DriveFileService: {
    instance: {
      createFile: vi.fn(),
    },
  },
}));

vi.mock('../../../src/utils/thumbnail.utils', () => ({
  isFileThumbnailable: vi.fn(),
}));

vi.mock('../../../src/services/drive/drive-folder.service', () => ({
  DriveFolderService: {
    instance: {
      createFolder: vi.fn(),
    },
  },
}));

vi.mock('../../../src/utils/logger.utils', () => ({
  logger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock('../../../src/utils/errors.utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../src/utils/errors.utils')>();
  return {
    ...actual,
    isAlreadyExistsError: vi.fn(),
    ErrorUtils: {
      report: vi.fn(),
    },
  };
});

describe('UploadService', () => {
  let sut: UploadService;

  const mockNetworkFacade = {
    uploadFile: vi.fn((_stream, _size, _bucket, callback) => {
      callback(null, 'mock-uploaded-file-id');
      return { stop: vi.fn() };
    }),
  } as unknown as NetworkFacade;

  beforeEach(() => {
    vi.clearAllMocks();
    sut = UploadService.instance;
    vi.mocked(DriveFolderService.instance.createFolder).mockReturnValue([
      Promise.resolve({ uuid: 'mock-folder-uuid' }),
    ] as unknown as ReturnType<typeof DriveFolderService.instance.createFolder>);
    vi.mocked(isAlreadyExistsError).mockReturnValue(false);
    vi.mocked(stat).mockResolvedValue(createMockStats(1024) as Awaited<ReturnType<typeof stat>>);
    vi.mocked(createReadStream).mockReturnValue(createMockReadStream() as ReturnType<typeof createReadStream>);
    vi.mocked(isFileThumbnailable).mockReturnValue(false);
    vi.mocked(DriveFileService.instance.createFile).mockResolvedValue({
      uuid: 'mock-file-uuid',
      fileId: 'mock-file-id',
    } as Awaited<ReturnType<typeof DriveFileService.instance.createFile>>);
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
  });
  describe('uploadFilesInBatches', () => {
    const bucket = 'test-bucket';
    const destinationFolderUuid = 'dest-uuid';
    const folderMap = new Map<string, string>();

    it('should properly return the total amount of bytes uploaded once finished with the uploads', async () => {
      const files = [
        createFileSystemNodeFixture({ type: 'file', name: 'file1.txt', relativePath: 'file1.txt', size: 100 }),
        createFileSystemNodeFixture({ type: 'file', name: 'file2.txt', relativePath: 'file2.txt', size: 200 }),
        createFileSystemNodeFixture({ type: 'file', name: 'file3.txt', relativePath: 'file3.txt', size: 300 }),
      ];
      const { currentProgress, emitProgress } = createProgressFixtures();

      const uploadFileWithRetrySpy = vi.spyOn(sut, 'uploadFileWithRetry').mockResolvedValue('mock-file-id');

      const result = await sut.uploadFilesInBatches({
        network: mockNetworkFacade,
        filesToUpload: files,
        folderMap,
        bucket,
        destinationFolderUuid,
        currentProgress,
        emitProgress,
      });

      expect(result).toBe(600);
      expect(uploadFileWithRetrySpy).toHaveBeenCalledTimes(3);
      uploadFileWithRetrySpy.mockRestore();
    });

    it('should properly upload files in batches of max 5', async () => {
      const files = Array.from({ length: 12 }, (_, i) =>
        createFileSystemNodeFixture({
          type: 'file',
          name: `file${i}.txt`,
          relativePath: `file${i}.txt`,
          size: 100,
        }),
      );
      const { currentProgress, emitProgress } = createProgressFixtures();

      const uploadFileWithRetrySpy = vi.spyOn(sut, 'uploadFileWithRetry').mockResolvedValue('mock-file-id');

      await sut.uploadFilesInBatches({
        network: mockNetworkFacade,
        filesToUpload: files,
        folderMap,
        bucket,
        destinationFolderUuid,
        currentProgress,
        emitProgress,
      });

      expect(uploadFileWithRetrySpy).toHaveBeenCalledTimes(12);
      uploadFileWithRetrySpy.mockRestore();
    });

    it('should properly emit progress and update the currentProgress object', async () => {
      const files = [
        createFileSystemNodeFixture({ type: 'file', name: 'file1.txt', relativePath: 'file1.txt', size: 500 }),
        createFileSystemNodeFixture({ type: 'file', name: 'file2.txt', relativePath: 'file2.txt', size: 1000 }),
      ];
      const { currentProgress, emitProgress } = createProgressFixtures();

      const uploadFileWithRetrySpy = vi.spyOn(sut, 'uploadFileWithRetry').mockResolvedValue('mock-file-id');

      await sut.uploadFilesInBatches({
        network: mockNetworkFacade,
        filesToUpload: files,
        folderMap,
        bucket,
        destinationFolderUuid,
        currentProgress,
        emitProgress,
      });

      expect(currentProgress.itemsUploaded).toBe(2);
      expect(currentProgress.bytesUploaded).toBe(1500);
      expect(emitProgress).toHaveBeenCalledTimes(2);
      uploadFileWithRetrySpy.mockRestore();
    });
  });
  describe('uploadFileWithRetry', () => {
    const bucket = 'test-bucket';
    const destinationFolderUuid = 'dest-uuid';
    const folderMap = new Map<string, string>();

    it('should properly create a file and return the created file id', async () => {
      const file = createFileSystemNodeFixture({
        type: 'file',
        name: 'test.txt',
        relativePath: 'test.txt',
        size: 1024,
        absolutePath: '/path/to/test.txt',
      });

      const result = await sut.uploadFileWithRetry({
        file,
        folderMap,
        network: mockNetworkFacade,
        bucket,
        destinationFolderUuid,
      });

      expect(result).toBe('mock-file-id');
      expect(stat).toHaveBeenCalledWith(file.absolutePath);
      expect(createReadStream).toHaveBeenCalledWith(file.absolutePath);
      expect(mockNetworkFacade.uploadFile).toHaveBeenCalledWith(
        expect.anything(),
        1024,
        bucket,
        expect.any(Function),
        expect.any(Function),
      );
      expect(DriveFileService.instance.createFile).toHaveBeenCalledWith(
        expect.objectContaining({
          plainName: 'test.txt',
          type: 'txt',
          size: 1024,
          folderUuid: destinationFolderUuid,
          fileId: 'mock-uploaded-file-id',
          bucket,
        }),
      );
    });

    it('should retry a maximum of 3 tries if an exception is thrown while uploading', async () => {
      vi.useFakeTimers();
      const file = createFileSystemNodeFixture({
        type: 'file',
        name: 'test.txt',
        relativePath: 'test.txt',
        size: 1024,
      });
      const error = new Error('Network error');

      vi.mocked(mockNetworkFacade.uploadFile)
        .mockImplementationOnce((_stream, _size, _bucket, callback) => {
          callback(error, null);
          return { stop: vi.fn() } as unknown as ReturnType<typeof mockNetworkFacade.uploadFile>;
        })
        .mockImplementationOnce((_stream, _size, _bucket, callback) => {
          callback(error, null);
          return { stop: vi.fn() } as unknown as ReturnType<typeof mockNetworkFacade.uploadFile>;
        })
        .mockImplementationOnce((_stream, _size, _bucket, callback) => {
          callback(null, 'success-file-id');
          return { stop: vi.fn() } as unknown as ReturnType<typeof mockNetworkFacade.uploadFile>;
        });

      const resultPromise = sut.uploadFileWithRetry({
        file,
        folderMap,
        network: mockNetworkFacade,
        bucket,
        destinationFolderUuid,
      });

      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result).toBe('mock-file-id');
      expect(mockNetworkFacade.uploadFile).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });
});
