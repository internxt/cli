import { beforeEach, describe, it, vi, expect } from 'vitest';
import { UploadFileService } from '../../../../src/services/network/upload/upload-file.service';
import { NetworkFacade } from '../../../../src/services/network/network-facade.service';
import { DriveFileService } from '../../../../src/services/drive/drive-file.service';
import { logger } from '../../../../src/utils/logger.utils';
import { isAlreadyExistsError } from '../../../../src/utils/errors.utils';
import { stat } from 'fs/promises';
import { createReadStream } from 'fs';
import {
  createFileStreamWithBuffer,
  isFileThumbnailable,
  tryUploadThumbnail,
} from '../../../../src/utils/thumbnail.utils';
import {
  createFileSystemNodeFixture,
  createMockReadStream,
  createMockStats,
  createProgressFixtures,
} from './upload.service.helpers';
import { newFileItem } from '../../../fixtures/drive.fixture';

vi.mock('fs', () => ({
  createReadStream: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  stat: vi.fn(),
}));

vi.mock('../../../../src/services/drive/drive-file.service', () => ({
  DriveFileService: {
    instance: {
      createFile: vi.fn(),
    },
  },
}));

vi.mock('../../../../src/utils/thumbnail.utils', () => ({
  isFileThumbnailable: vi.fn(),
  tryUploadThumbnail: vi.fn(),
  createFileStreamWithBuffer: vi.fn(),
}));

vi.mock('../../../../src/utils/stream.utils', () => ({
  StreamUtils: {
    createFileStreamWithBuffer: vi.fn(),
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
  };
});

describe('UploadFileService', () => {
  let sut: UploadFileService;
  const mockFile = newFileItem();

  const mockNetworkFacade = {
    uploadFile: vi.fn((_stream, _size, _bucket, callback) => {
      callback(null, 'mock-uploaded-file-id');
      return { stop: vi.fn() };
    }),
  } as unknown as NetworkFacade;

  beforeEach(() => {
    vi.clearAllMocks();
    sut = UploadFileService.instance;
    vi.mocked(isAlreadyExistsError).mockReturnValue(false);
    vi.mocked(stat).mockResolvedValue(createMockStats(1024) as Awaited<ReturnType<typeof stat>>);
    vi.mocked(createReadStream).mockReturnValue(createMockReadStream() as ReturnType<typeof createReadStream>);
    vi.mocked(isFileThumbnailable).mockReturnValue(false);
    vi.mocked(createFileStreamWithBuffer).mockReturnValue({
      fileStream: createMockReadStream() as ReturnType<typeof createReadStream>,
      bufferStream: undefined,
    });
    vi.mocked(tryUploadThumbnail).mockResolvedValue(undefined);
    vi.mocked(DriveFileService.instance.createFile).mockResolvedValue(mockFile);
  });

  describe('uploadFilesConcurrently', () => {
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

      const uploadFileWithRetrySpy = vi.spyOn(sut, 'uploadFileWithRetry').mockResolvedValue(mockFile);

      const result = await sut.uploadFilesConcurrently({
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

    it('should properly upload files in arrays of max 10', async () => {
      const files = Array.from({ length: 12 }, (_, i) =>
        createFileSystemNodeFixture({
          type: 'file',
          name: `file${i}.txt`,
          relativePath: `file${i}.txt`,
          size: 100,
        }),
      );
      const { currentProgress, emitProgress } = createProgressFixtures();

      const uploadFileWithRetrySpy = vi.spyOn(sut, 'uploadFileWithRetry').mockResolvedValue(mockFile);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const concurrencyArraySpy = vi.spyOn(sut as any, 'concurrencyArray');

      await sut.uploadFilesConcurrently({
        network: mockNetworkFacade,
        filesToUpload: files,
        folderMap,
        bucket,
        destinationFolderUuid,
        currentProgress,
        emitProgress,
      });

      expect(uploadFileWithRetrySpy).toHaveBeenCalledTimes(12);
      expect(concurrencyArraySpy).toHaveBeenCalledWith(files, 10);
      const batches = concurrencyArraySpy.mock.results[0].value;
      expect(batches).toHaveLength(2);
      expect(batches[0]).toHaveLength(10);
      expect(batches[1]).toHaveLength(2);

      uploadFileWithRetrySpy.mockRestore();
      concurrencyArraySpy.mockRestore();
    });

    it('should properly emit progress and update the currentProgress object', async () => {
      const files = [
        createFileSystemNodeFixture({ type: 'file', name: 'file1.txt', relativePath: 'file1.txt', size: 500 }),
        createFileSystemNodeFixture({ type: 'file', name: 'file2.txt', relativePath: 'file2.txt', size: 1000 }),
      ];
      const { currentProgress, emitProgress } = createProgressFixtures();

      const uploadFileWithRetrySpy = vi.spyOn(sut, 'uploadFileWithRetry').mockResolvedValue(mockFile);

      await sut.uploadFilesConcurrently({
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

    it('should skip files when parent folder is not found in folderMap', async () => {
      const bucket = 'test-bucket';
      const destinationFolderUuid = 'dest-uuid';
      const folderMap = new Map<string, string>();
      const files = [
        createFileSystemNodeFixture({
          type: 'file',
          name: 'nested.txt',
          relativePath: 'subfolder/nested.txt',
          size: 100,
        }),
      ];
      const { currentProgress, emitProgress } = createProgressFixtures();

      const uploadFileWithRetrySpy = vi.spyOn(sut, 'uploadFileWithRetry');

      const result = await sut.uploadFilesConcurrently({
        network: mockNetworkFacade,
        filesToUpload: files,
        folderMap,
        bucket,
        destinationFolderUuid,
        currentProgress,
        emitProgress,
      });

      expect(result).toBe(0);
      expect(logger.warn).toHaveBeenCalledWith('Parent folder not found for subfolder/nested.txt, skipping...');
      expect(uploadFileWithRetrySpy).not.toHaveBeenCalled();

      uploadFileWithRetrySpy.mockRestore();
    });
  });

  describe('uploadFileWithRetry', () => {
    const bucket = 'test-bucket';
    const destinationFolderUuid = 'dest-uuid';

    it('should properly create a file and return the created file', async () => {
      const file = createFileSystemNodeFixture({
        type: 'file',
        name: 'test',
        relativePath: 'test.txt',
        size: 1024,
        absolutePath: '/path/to/test.txt',
      });

      const result = await sut.uploadFileWithRetry({
        file,
        network: mockNetworkFacade,
        bucket,
        parentFolderUuid: destinationFolderUuid,
      });

      expect(result).toBe(mockFile);
      expect(stat).toHaveBeenCalledWith(file.absolutePath);
      expect(mockNetworkFacade.uploadFile).toHaveBeenCalledWith(
        expect.anything(),
        1024,
        bucket,
        expect.any(Function),
        expect.any(Function),
      );
      expect(DriveFileService.instance.createFile).toHaveBeenCalledWith(
        expect.objectContaining({
          plainName: 'test',
          type: 'txt',
          size: 1024,
          folderUuid: destinationFolderUuid,
          fileId: 'mock-uploaded-file-id',
          bucket,
          encryptVersion: '03-aes',
        }),
      );
    });

    it('should retry a maximum of 2 retries (3 total attempts) if an exception is thrown while uploading', async () => {
      vi.useFakeTimers();
      const file = createFileSystemNodeFixture({
        type: 'file',
        name: 'test',
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
        network: mockNetworkFacade,
        bucket,
        parentFolderUuid: destinationFolderUuid,
      });

      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result).toBe(mockFile);
      expect(mockNetworkFacade.uploadFile).toHaveBeenCalledTimes(3);
      expect(logger.warn).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });

    it('should upload empty files and return the created file', async () => {
      const file = createFileSystemNodeFixture({
        type: 'file',
        name: 'empty',
        relativePath: 'empty.txt',
        size: 0,
        absolutePath: '/path/to/empty.txt',
      });

      vi.mocked(stat).mockResolvedValue(createMockStats(0) as Awaited<ReturnType<typeof stat>>);

      const result = await sut.uploadFileWithRetry({
        file,
        network: mockNetworkFacade,
        bucket,
        parentFolderUuid: destinationFolderUuid,
      });

      expect(result).toBe(mockFile);
      expect(stat).toHaveBeenCalledWith(file.absolutePath);
      expect(mockNetworkFacade.uploadFile).not.toHaveBeenCalled();
      expect(DriveFileService.instance.createFile).toHaveBeenCalledWith(
        expect.objectContaining({
          fileId: undefined,
          plainName: 'empty',
          type: 'txt',
          size: 0,
          folderUuid: destinationFolderUuid,
          bucket,
          encryptVersion: '03-aes',
        }),
      );
    });

    it('should call tryUploadThumbnail when bufferStream is present', async () => {
      const mockBufferStream = { getBuffer: vi.fn() };
      vi.mocked(createFileStreamWithBuffer).mockReturnValue({
        fileStream: createMockReadStream() as ReturnType<typeof createReadStream>,
        bufferStream: mockBufferStream as unknown as ReturnType<typeof createFileStreamWithBuffer>['bufferStream'],
      });

      const file = createFileSystemNodeFixture({
        type: 'file',
        name: 'image.png',
        relativePath: 'image.png',
        size: 1024,
      });

      await sut.uploadFileWithRetry({
        file,
        network: mockNetworkFacade,
        bucket,
        parentFolderUuid: destinationFolderUuid,
      });

      expect(tryUploadThumbnail).toHaveBeenCalledWith({
        bufferStream: mockBufferStream,
        fileType: 'png',
        userBucket: bucket,
        fileUuid: mockFile.uuid,
        networkFacade: mockNetworkFacade,
      });
    });

    it('should return null when file already exists', async () => {
      vi.mocked(isAlreadyExistsError).mockReturnValue(true);
      vi.mocked(mockNetworkFacade.uploadFile).mockImplementation((_stream, _size, _bucket, callback) => {
        callback(new Error('File already exists'), null);
        return { stop: vi.fn() } as unknown as ReturnType<typeof mockNetworkFacade.uploadFile>;
      });

      const file = createFileSystemNodeFixture({
        type: 'file',
        name: 'duplicate.txt',
        relativePath: 'duplicate.txt',
        size: 1024,
      });

      const result = await sut.uploadFileWithRetry({
        file,
        network: mockNetworkFacade,
        bucket,
        parentFolderUuid: destinationFolderUuid,
      });

      expect(result).toBeNull();
      expect(logger.info).toHaveBeenCalledWith('File duplicate.txt already exists, skipping...');
    });

    it('should return null after max retries exceeded', async () => {
      vi.useFakeTimers();
      const file = createFileSystemNodeFixture({
        type: 'file',
        name: 'fail.txt',
        relativePath: 'fail.txt',
        size: 1024,
      });
      const error = new Error('Network error');

      vi.mocked(mockNetworkFacade.uploadFile).mockImplementation((_stream, _size, _bucket, callback) => {
        callback(error, null);
        return { stop: vi.fn() } as unknown as ReturnType<typeof mockNetworkFacade.uploadFile>;
      });

      const resultPromise = sut.uploadFileWithRetry({
        file,
        network: mockNetworkFacade,
        bucket,
        parentFolderUuid: destinationFolderUuid,
      });

      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result).toBeNull();
      expect(logger.error).toHaveBeenCalledWith('Failed to upload file fail.txt after 3 attempts');
      expect(mockNetworkFacade.uploadFile).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });
  });
});
