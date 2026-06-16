import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fail } from 'node:assert';
import { WebDavFolderService } from '../../../src/services/webdav/webdav-folder.service';
import { DriveFolderService } from '../../../src/services/drive/drive-folder.service';
import { ConfigService } from '../../../src/services/config.service';
import { AuthService } from '../../../src/services/auth.service';
import { newFolderItem, newCreateFolderResponse } from '../../fixtures/drive.fixture';
import { ConflictError } from '../../../src/utils/errors.utils';
import { UserCredentialsFixture } from '../../fixtures/login.fixture';

describe('WebDavFolderService', () => {
  let sut: WebDavFolderService;
  let driveFolderService: DriveFolderService;
  let configService: ConfigService;
  const rootFolderId = 'root-uuid-123';

  const mockWebdavConfig = (createFullPath: boolean) => {
    vi.spyOn(configService, 'readWebdavConfig').mockResolvedValue({
      createFullPath,
      port: '3005',
      protocol: 'https',
      host: 'localhost',
      timeoutMinutes: 5,
      customAuth: false,
      username: '',
      password: '',
      deleteFilesPermanently: false,
    });
  };

  const mockAuthDetails = (rootFolderId: string) => {
    vi.spyOn(AuthService.instance, 'getAuthDetails').mockResolvedValue({
      ...UserCredentialsFixture,
      user: { ...UserCredentialsFixture.user, rootFolderId },
    });
  };

  beforeEach(() => {
    driveFolderService = DriveFolderService.instance;
    configService = ConfigService.instance;
    sut = WebDavFolderService.instance;
  });

  describe('creating parent folders', () => {
    test('when the full path creation is disabled, then a conflict error is thrown', async () => {
      mockWebdavConfig(false);

      try {
        await sut.createParentPathOrThrow('/backup/folder1/');
        fail('Expected function to throw ConflictError, but it did not.');
      } catch (error) {
        expect(error).to.be.instanceOf(ConflictError);
        expect((error as ConflictError).message).to.contain(
          'Parent folders not found on Internxt Drive at /backup/folder1/',
        );
      }
    });

    test('when the path has a single segment, then a single folder is created at the root level', async () => {
      const createdFolder = newFolderItem({ name: 'backup', uuid: 'backup-uuid' });

      mockWebdavConfig(true);
      mockAuthDetails(rootFolderId);
      const getDriveFolderSpy = vi.spyOn(sut, 'getDriveFolderItemFromPath').mockResolvedValue(undefined);
      const createFolderSpy = vi.spyOn(sut, 'createFolder').mockResolvedValue(createdFolder);

      const result = await sut.createParentPathOrThrow('/backup/');

      expect(result).to.deep.equal(createdFolder);
      expect(getDriveFolderSpy).toHaveBeenCalledWith('/backup/');
      expect(createFolderSpy).toHaveBeenCalledWith({
        folderName: 'backup',
        parentFolderUuid: rootFolderId,
      });
    });

    test('when the folder already exists, then the existing folder is returned without creating a new one', async () => {
      const existingFolder = newFolderItem({ name: 'backup', uuid: 'backup-uuid' });

      mockWebdavConfig(true);
      mockAuthDetails(rootFolderId);
      const getDriveFolderSpy = vi.spyOn(sut, 'getDriveFolderItemFromPath').mockResolvedValue(existingFolder);
      const createFolderSpy = vi.spyOn(sut, 'createFolder');

      const result = await sut.createParentPathOrThrow('/backup/');

      expect(result).to.deep.equal(existingFolder);
      expect(getDriveFolderSpy).toHaveBeenCalledWith('/backup/');
      expect(createFolderSpy).not.toHaveBeenCalled();
    });

    test('when the path has multiple segments, then nested folders are created recursively', async () => {
      const backupFolder = newFolderItem({ name: 'backup', uuid: 'backup-uuid' });
      const folder1 = newFolderItem({ name: 'folder1', uuid: 'folder1-uuid' });
      const subfolder = newFolderItem({ name: 'subfolder', uuid: 'subfolder-uuid' });

      mockWebdavConfig(true);
      mockAuthDetails(rootFolderId);

      const getDriveFolderSpy = vi
        .spyOn(sut, 'getDriveFolderItemFromPath')
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      const createFolderSpy = vi
        .spyOn(sut, 'createFolder')
        .mockResolvedValueOnce(backupFolder)
        .mockResolvedValueOnce(folder1)
        .mockResolvedValueOnce(subfolder);

      const result = await sut.createParentPathOrThrow('/backup/folder1/subfolder/');

      expect(result).to.deep.equal(subfolder);
      expect(getDriveFolderSpy).toHaveBeenCalledTimes(3);
      expect(createFolderSpy).toHaveBeenCalledTimes(3);
      expect(createFolderSpy).toHaveBeenNthCalledWith(1, {
        folderName: 'backup',
        parentFolderUuid: rootFolderId,
      });
      expect(createFolderSpy).toHaveBeenNthCalledWith(2, {
        folderName: 'folder1',
        parentFolderUuid: backupFolder.uuid,
      });
      expect(createFolderSpy).toHaveBeenNthCalledWith(3, {
        folderName: 'subfolder',
        parentFolderUuid: folder1.uuid,
      });
    });
  });

  describe('creating a folder', () => {
    test('when a folder is created, then the system waits for backend propagation', async () => {
      vi.useFakeTimers();

      const folderResponse = newCreateFolderResponse({
        plainName: 'test-folder',
        uuid: 'test-uuid',
      });

      vi.spyOn(driveFolderService, 'createFolder').mockResolvedValue([
        Promise.resolve(folderResponse),
        { cancel: () => {} },
      ]);

      const createPromise = sut.createFolder({
        folderName: 'test-folder',
        parentFolderUuid: 'parent-uuid',
      });

      await vi.advanceTimersByTimeAsync(500);

      const result = await createPromise;

      expect(result.uuid).to.equal('test-uuid');
      expect(result.name).to.equal('test-folder');
      expect(driveFolderService.createFolder).toHaveBeenCalledWith({
        plainName: 'test-folder',
        parentFolderUuid: 'parent-uuid',
      });

      vi.useRealTimers();
    });
  });
});
