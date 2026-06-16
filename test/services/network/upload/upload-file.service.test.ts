import { beforeEach, describe, test, vi, expect } from 'vitest';
import { UploadFileService } from '../../../../src/services/network/upload/upload-file.service';
import { NetworkFacade } from '../../../../src/services/network/network-facade.service';
import { DriveFileService } from '../../../../src/services/drive/drive-file.service';
import { logger } from '../../../../src/utils/logger.utils';
import { ErrorUtils } from '../../../../src/utils/errors.utils';
import { stat } from 'fs/promises';
import { createReadStream } from 'fs';
import {
  createFileSystemNodeFixture,
  createMockReadStream,
  createMockStats,
  createProgressFixtures,
} from './upload.service.helpers';
import { newFileItem } from '../../../fixtures/drive.fixture';
import { ThumbnailUtils } from '../../../../src/utils/thumbnail.utils';
import { ThumbnailService } from '../../../../src/services/thumbnail.service';

vi.mock('fs', () => ({
  createReadStream: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  stat: vi.fn(),
}));

describe('Upload File Service', () => {
  let sut: UploadFileService;
  const mockFile = newFileItem({ fileId: 'mock-uploaded-file-id' });

  const mockNetworkFacade = {
    uploadFile: vi.fn().mockResolvedValue(mockFile.fileId),
  } as unknown as NetworkFacade;

  beforeEach(() => {
    sut = UploadFileService.instance;
    vi.mocked(stat).mockResolvedValue(createMockStats(1024) as Awaited<ReturnType<typeof stat>>);
    vi.mocked(createReadStream).mockReturnValue(createMockReadStream() as ReturnType<typeof createReadStream>);
    vi.spyOn(ErrorUtils, 'isAlreadyExistsError').mockReturnValue(false);
    vi.spyOn(ThumbnailUtils, 'isFileThumbnailable').mockReturnValue(false);
    vi.spyOn(ThumbnailService.instance, 'tryUploadThumbnail').mockResolvedValue(undefined);
    vi.spyOn(ThumbnailService.instance, 'createFileStreamWithBuffer').mockReturnValue({
      fileStream: createMockReadStream() as ReturnType<typeof createReadStream>,
      bufferStream: undefined,
    });
    vi.spyOn(DriveFileService.instance, 'createFile').mockResolvedValue(mockFile);
  });

  describe('uploading files concurrently', () => {
    const bucket = 'test-bucket';
    const destinationFolderUuid = 'dest-uuid';
    const folderMap = new Map<string, string>();

    test('when all files finish uploading, then the total bytes uploaded is returned', async () => {
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
        debugMode: false,
        reporter: vi.fn(),
      });

      expect(result).toBe(600);
      expect(uploadFileWithRetrySpy).toHaveBeenCalledTimes(3);
      uploadFileWithRetrySpy.mockRestore();
    });

    test('when there are more than ten files to upload, then they are processed in batches', async () => {
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
        debugMode: false,
        reporter: vi.fn(),
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

    test('when files are uploaded, then progress is emitted and updated', async () => {
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
        debugMode: false,
        reporter: vi.fn(),
      });

      expect(currentProgress.itemsUploaded).toBe(2);
      expect(currentProgress.bytesUploaded).toBe(1500);
      expect(emitProgress).toHaveBeenCalledTimes(2);
      uploadFileWithRetrySpy.mockRestore();
    });

    test('when a parent folder is not found, then the file is skipped', async () => {
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

      const reporter = vi.fn();

      const result = await sut.uploadFilesConcurrently({
        network: mockNetworkFacade,
        filesToUpload: files,
        folderMap,
        bucket,
        destinationFolderUuid,
        currentProgress,
        emitProgress,
        debugMode: true,
        reporter,
      });

      expect(result).toBe(0);
      expect(reporter).toHaveBeenLastCalledWith(
        expect.stringContaining('Parent folder not found for subfolder/nested.txt, skipping...'),
      );
      expect(uploadFileWithRetrySpy).not.toHaveBeenCalled();

      uploadFileWithRetrySpy.mockRestore();
    });
  });

  describe('uploading a file with retry', () => {
    const bucket = 'test-bucket';
    const destinationFolderUuid = 'dest-uuid';

    test('when a file is uploaded, then the created file entry is returned', async () => {
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
        debugMode: false,
        reporter: vi.fn(),
      });

      expect(result).toBe(mockFile);
      expect(stat).toHaveBeenCalledWith(file.absolutePath);
      expect(mockNetworkFacade.uploadFile).toHaveBeenCalledWith({
        from: expect.anything(),
        size: 1024,
        bucketId: bucket,
        progressCallback: expect.any(Function),
      });
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

    test('when an error occurs during upload, then up to three attempts are made', async () => {
      vi.useFakeTimers();
      const file = createFileSystemNodeFixture({
        type: 'file',
        name: 'test',
        relativePath: 'test.txt',
        size: 1024,
      });
      const error = new Error('Network error');

      vi.mocked(mockNetworkFacade.uploadFile)
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce('success-file-id');

      const reporter = vi.fn();

      const resultPromise = sut.uploadFileWithRetry({
        file,
        network: mockNetworkFacade,
        bucket,
        parentFolderUuid: destinationFolderUuid,
        debugMode: true,
        reporter,
      });

      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result).toBe(mockFile);
      expect(mockNetworkFacade.uploadFile).toHaveBeenCalledTimes(3);
      expect(reporter).toHaveBeenCalledTimes(4);

      vi.useRealTimers();
    });

    test('when an empty file is uploaded, then the file entry is still created', async () => {
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
        debugMode: false,
        reporter: vi.fn(),
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

    test('when a thumbnailable file is uploaded, then a thumbnail is generated', async () => {
      const mockBufferStream = { getBuffer: vi.fn() };
      vi.spyOn(ThumbnailService.instance, 'createFileStreamWithBuffer').mockReturnValue({
        fileStream: createMockReadStream() as ReturnType<typeof createReadStream>,
        bufferStream: mockBufferStream as unknown as ReturnType<
          typeof ThumbnailService.instance.createFileStreamWithBuffer
        >['bufferStream'],
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
        debugMode: false,
        reporter: vi.fn(),
      });

      expect(ThumbnailService.instance.tryUploadThumbnail).toHaveBeenCalledWith({
        bufferStream: mockBufferStream,
        fileType: 'png',
        bucket,
        fileUuid: mockFile.uuid,
        networkFacade: mockNetworkFacade,
        size: file.size,
      });
    });

    test('when the file already exists, then null is returned', async () => {
      vi.spyOn(ErrorUtils, 'isAlreadyExistsError').mockReturnValue(true);
      vi.mocked(mockNetworkFacade.uploadFile).mockRejectedValue(new Error('File already exists'));

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
        debugMode: false,
        reporter: vi.fn(),
      });

      expect(result).toBeNull();
      expect(logger.info).toHaveBeenCalledWith('File duplicate.txt already exists, skipping...');
    });

    test('when all upload attempts fail, then null is returned', async () => {
      vi.useFakeTimers();
      const file = createFileSystemNodeFixture({
        type: 'file',
        name: 'fail.txt',
        relativePath: 'fail.txt',
        size: 1024,
      });
      const error = new Error('Network error');

      vi.mocked(mockNetworkFacade.uploadFile).mockRejectedValue(error);

      const reporter = vi.fn();

      const resultPromise = sut.uploadFileWithRetry({
        file,
        network: mockNetworkFacade,
        bucket,
        parentFolderUuid: destinationFolderUuid,
        debugMode: true,
        reporter,
      });

      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result).toBeNull();
      expect(reporter).toHaveBeenCalledTimes(3);
      expect(reporter).toHaveBeenLastCalledWith(
        expect.stringContaining(`Error: Failed to upload file '${file.name}' after 3 attempts`),
      );
      expect(mockNetworkFacade.uploadFile).toHaveBeenCalledTimes(3);

      vi.useRealTimers();
    });
  });
});
