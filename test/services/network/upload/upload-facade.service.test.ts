import { beforeEach, describe, it, vi, expect } from 'vitest';
import { UploadFacade } from '../../../../src/services/network/upload/upload-facade.service';
import { CLIUtils } from '../../../../src/utils/cli.utils';
import { logger } from '../../../../src/utils/logger.utils';
import { LocalFilesystemService } from '../../../../src/services/local-filesystem/local-filesystem.service';
import { UploadFolderService } from '../../../../src/services/network/upload/upload-folder.service';
import { UploadFileService } from '../../../../src/services/network/upload/upload-file.service';
import { NetworkFacade } from '../../../../src/services/network/network-facade.service';
import { LoginUserDetails } from '../../../../src/types/command.types';
import { createFileSystemNodeFixture } from './upload.service.helpers';
import { AsyncUtils } from '../../../../src/utils/async.utils';

vi.mock('../../../../src/utils/cli.utils', () => ({
  CLIUtils: {
    timer: vi.fn(),
    prepareNetwork: vi.fn(),
  },
}));

vi.mock('../../../../src/utils/logger.utils', () => ({
  logger: {
    info: vi.fn(),
  },
}));

vi.mock('../../../../src/services/local-filesystem/local-filesystem.service', () => ({
  LocalFilesystemService: {
    instance: {
      scanLocalDirectory: vi.fn(),
    },
  },
}));

vi.mock('../../../../src/services/network/upload/upload-folder.service', () => ({
  UploadFolderService: {
    instance: {
      createFolders: vi.fn(),
    },
  },
}));

vi.mock('../../../../src/services/network/upload/upload-file.service', () => ({
  UploadFileService: {
    instance: {
      uploadFilesConcurrently: vi.fn(),
    },
  },
}));

vi.mock('../../../../src/utils/async.utils', () => ({
  AsyncUtils: {
    sleep: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('UploadFacade', () => {
  let sut: UploadFacade;

  const mockNetworkFacade = {} as NetworkFacade;

  const mockLoginUserDetails = {
    bridgeUser: 'test-bridge-user',
    userId: 'test-user-id',
    mnemonic: 'test-mnemonic',
    bucket: 'test-bucket',
  } as LoginUserDetails;
  const folderName = 'test-folder';
  const folderMap = new Map([[folderName, 'folder-uuid-123']]);
  beforeEach(() => {
    vi.clearAllMocks();
    sut = UploadFacade.instance;
    vi.mocked(CLIUtils.prepareNetwork).mockReturnValue(mockNetworkFacade);
    vi.mocked(LocalFilesystemService.instance.scanLocalDirectory).mockResolvedValue({
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
    vi.mocked(UploadFolderService.instance.createFolders).mockResolvedValue(folderMap);
    vi.mocked(UploadFileService.instance.uploadFilesConcurrently).mockResolvedValue(500);
    vi.mocked(CLIUtils.timer).mockReturnValue({
      stop: vi.fn().mockReturnValue(1000),
    });
  });

  describe('uploadFolder', () => {
    const localPath = '/local/test-folder';
    const destinationFolderUuid = 'dest-uuid';
    const onProgress = vi.fn();

    it('should throw an error if createFolders returns an empty map', async () => {
      vi.mocked(LocalFilesystemService.instance.scanLocalDirectory).mockResolvedValue({
        folders: [createFileSystemNodeFixture({ type: 'folder', name: 'test', relativePath: 'test' })],
        files: [],
        totalItems: 1,
        totalBytes: 0,
      });

      vi.mocked(UploadFolderService.instance.createFolders).mockResolvedValue(new Map());

      await expect(
        sut.uploadFolder({
          localPath,
          destinationFolderUuid,
          loginUserDetails: mockLoginUserDetails,
          jsonFlag: false,
          onProgress,
        }),
      ).rejects.toThrow('Failed to create folders, cannot upload files');

      expect(UploadFolderService.instance.createFolders).toHaveBeenCalled();
      expect(UploadFileService.instance.uploadFilesConcurrently).not.toHaveBeenCalled();
    });

    it('should properly handle the upload of folder and the creation of file and return proper result', async () => {
      const result = await sut.uploadFolder({
        localPath,
        destinationFolderUuid,
        loginUserDetails: mockLoginUserDetails,
        jsonFlag: false,
        onProgress,
      });

      expect(result).toBeDefined();
      expect(result.totalBytes).toBe(500);
      expect(result.rootFolderId).toBe('folder-uuid-123');
      expect(result.uploadTimeMs).toBe(1000);
      expect(UploadFolderService.instance.createFolders).toHaveBeenCalled();
      expect(UploadFileService.instance.uploadFilesConcurrently).toHaveBeenCalled();
      expect(logger.info).toHaveBeenCalledWith(`Scanned folder ${localPath}: found 2 items, total size 500 bytes.`);
    });

    it('should report progress correctly during upload', async () => {
      const folderMap = new Map([[folderName, 'folder-uuid-123']]);

      vi.mocked(UploadFolderService.instance.createFolders).mockImplementation(
        async ({ currentProgress, emitProgress }) => {
          currentProgress.itemsUploaded = 1;
          emitProgress();
          return folderMap;
        },
      );

      vi.mocked(UploadFileService.instance.uploadFilesConcurrently).mockImplementation(
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
      });

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenNthCalledWith(1, { percentage: 25 });
      expect(onProgress).toHaveBeenNthCalledWith(2, { percentage: 100 });
    });

    it('should wait 500ms between folder creation and file upload to prevent backend indexing issues', async () => {
      vi.useFakeTimers();

      vi.mocked(UploadFolderService.instance.createFolders).mockResolvedValue(folderMap);
      vi.mocked(UploadFileService.instance.uploadFilesConcurrently).mockResolvedValue(100);

      const uploadPromise = sut.uploadFolder({
        localPath,
        destinationFolderUuid,
        loginUserDetails: mockLoginUserDetails,
        jsonFlag: false,
        onProgress,
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
