import { beforeEach, describe, test, vi, expect } from 'vitest';
import { UploadFacade } from '../../../../src/services/network/upload/upload-facade.service';
import { CLIUtils } from '../../../../src/utils/cli.utils';
import { logger } from '../../../../src/utils/logger.utils';
import { LocalFilesystemService } from '../../../../src/services/local-filesystem/local-filesystem.service';
import { UploadFolderService } from '../../../../src/services/network/upload/upload-folder.service';
import { UploadFileService } from '../../../../src/services/network/upload/upload-file.service';
import { LoginUserDetails } from '../../../../src/types/command.types';
import { createFileSystemNodeFixture } from './upload.service.helpers';
import { AsyncUtils } from '../../../../src/utils/async.utils';
import { UserFixture } from '../../../fixtures/auth.fixture';
import { getNetworkOptionsMock } from '../../../fixtures/webdav.fixture';

describe('Upload Facade', () => {
  let sut: UploadFacade;

  const mockNetworkOptions = getNetworkOptionsMock();

  const mockLoginUserDetails: LoginUserDetails = UserFixture;
  const folderName = 'test-folder';
  const folderMap = new Map([[folderName, 'folder-uuid-123']]);

  beforeEach(() => {
    sut = UploadFacade.instance;
    vi.spyOn(LocalFilesystemService.instance, 'scanLocalDirectory').mockResolvedValue({
      folders: [createFileSystemNodeFixture({ type: 'folder', name: folderName, relativePath: folderName })],
      files: [
        createFileSystemNodeFixture({
          type: 'file',
          name: 'file1.txt',
          relativePath: `${folderName}/file1.txt`,
          size: 500,
        }),
      ],
      totalItems: 2,
      totalBytes: 500,
    });
    vi.spyOn(UploadFolderService.instance, 'createFolders').mockResolvedValue(folderMap);
    vi.spyOn(UploadFileService.instance, 'uploadFilesConcurrently').mockResolvedValue(500);
    vi.spyOn(CLIUtils, 'prepareNetwork').mockResolvedValue(mockNetworkOptions);
    vi.spyOn(CLIUtils, 'timer').mockReturnValue({
      stop: vi.fn().mockReturnValue(1000),
    });
    vi.spyOn(AsyncUtils, 'sleep').mockResolvedValue();
    vi.spyOn(logger, 'info').mockImplementation(vi.fn());
  });

  describe('uploading a folder', () => {
    const localPath = '/local/test-folder';
    const destinationFolderUuid = 'dest-uuid';
    const onProgress = vi.fn();

    test('when folder creation returns no results, then an error is thrown', async () => {
      vi.spyOn(LocalFilesystemService.instance, 'scanLocalDirectory').mockResolvedValue({
        folders: [createFileSystemNodeFixture({ type: 'folder', name: 'test', relativePath: 'test' })],
        files: [],
        totalItems: 1,
        totalBytes: 0,
      });

      vi.spyOn(UploadFolderService.instance, 'createFolders').mockResolvedValue(new Map());

      await expect(
        sut.uploadFolder({
          localPath,
          destinationFolderUuid,
          loginUserDetails: mockLoginUserDetails,
          jsonFlag: false,
          onProgress,
          debugMode: false,
          reporter: vi.fn(),
        }),
      ).rejects.toThrow('Failed to create folders, cannot upload files');

      expect(UploadFolderService.instance.createFolders).toHaveBeenCalled();
      expect(UploadFileService.instance.uploadFilesConcurrently).not.toHaveBeenCalled();
    });

    test('when a folder is uploaded with files, then the correct result is returned', async () => {
      const reporter = vi.fn();
      const result = await sut.uploadFolder({
        localPath,
        destinationFolderUuid,
        loginUserDetails: mockLoginUserDetails,
        jsonFlag: false,
        onProgress,
        debugMode: true,
        reporter,
      });

      expect(result).toBeDefined();
      expect(result.totalBytes).toBe(500);
      expect(result.rootFolderId).toBe('folder-uuid-123');
      expect(result.uploadTimeMs).toBe(1000);
      expect(UploadFolderService.instance.createFolders).toHaveBeenCalled();
      expect(UploadFileService.instance.uploadFilesConcurrently).toHaveBeenCalled();
      expect(reporter).toHaveBeenCalledWith(
        expect.stringContaining(`Scanned folder ${localPath}: found 2 items, total size 500 bytes.`),
      );
    });

    test('when uploading, then progress is reported correctly', async () => {
      const folderMap = new Map([[folderName, 'folder-uuid-123']]);

      vi.spyOn(UploadFolderService.instance, 'createFolders').mockImplementation(
        async ({ currentProgress, emitProgress }) => {
          currentProgress.itemsUploaded = 1;
          emitProgress();
          return folderMap;
        },
      );

      vi.spyOn(UploadFileService.instance, 'uploadFilesConcurrently').mockImplementation(
        async ({ currentProgress, emitProgress }) => {
          currentProgress.itemsUploaded = 2;
          currentProgress.bytesUploaded = 500;
          emitProgress();
          return 500;
        },
      );

      await sut.uploadFolder({
        localPath,
        destinationFolderUuid,
        loginUserDetails: mockLoginUserDetails,
        jsonFlag: false,
        onProgress,
        debugMode: false,
        reporter: vi.fn(),
      });

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenNthCalledWith(1, { percentage: 25 });
      expect(onProgress).toHaveBeenNthCalledWith(2, { percentage: 100 });
    });

    test('when folders are created before uploading files, then the system waits to prevent indexing issues', async () => {
      vi.useFakeTimers();

      vi.spyOn(UploadFolderService.instance, 'createFolders').mockResolvedValue(folderMap);
      vi.spyOn(UploadFileService.instance, 'uploadFilesConcurrently').mockResolvedValue(100);

      const uploadPromise = sut.uploadFolder({
        localPath,
        destinationFolderUuid,
        loginUserDetails: mockLoginUserDetails,
        jsonFlag: false,
        onProgress,
        debugMode: false,
        reporter: vi.fn(),
      });

      await vi.advanceTimersByTimeAsync(500);
      await uploadPromise;

      expect(AsyncUtils.sleep).toHaveBeenCalledWith(500);
      expect(AsyncUtils.sleep).toHaveBeenCalledTimes(1);
      expect(UploadFolderService.instance.createFolders).toHaveBeenCalled();
      expect(UploadFileService.instance.uploadFilesConcurrently).toHaveBeenCalled();

      vi.useRealTimers();
    });
  });
});
