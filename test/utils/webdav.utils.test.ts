import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WebDavUtils } from '../../src/utils/webdav.utils';
import { createWebDavRequestFixture } from '../fixtures/webdav.fixture';
import {
  getDriveDatabaseManager,
  getDriveFileDatabaseFixture,
  getDriveFolderDatabaseFixture,
} from '../fixtures/drive-database.fixture';
import { WebDavRequestedResource } from '../../src/types/webdav.types';
import { newFileItem, newFolderItem } from '../fixtures/drive.fixture';
import { DriveFolderService } from '../../src/services/drive/drive-folder.service';
import { DriveFileService } from '../../src/services/drive/drive-file.service';
import { fail } from 'node:assert';
import { NotFoundError } from '../../src/utils/errors.utils';

describe('Webdav utils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('joinURL', () => {
    it('When a list of path components are given, then it should generate a correct href', () => {
      const href = WebDavUtils.joinURL('/path', 'to', 'file');
      expect(href).to.be.equal('/path/to/file');
    });

    it('When a list of path components are given, should generate a correct href and remove incorrect characters', () => {
      const href = WebDavUtils.joinURL('/path', 'to', 'folder/');
      expect(href).to.be.equal('/path/to/folder/');
    });
  });

  describe('removeHostFromURL', () => {
    it('When a list of path components are given, then it should generate a correct href', () => {
      expect(WebDavUtils.removeHostFromURL('https://test.com/folder1')).to.be.equal('/folder1');
      expect(WebDavUtils.removeHostFromURL('http://test.com/folder1')).to.be.equal('/folder1');
      expect(WebDavUtils.removeHostFromURL('test.com/folder1')).to.be.equal('/folder1');
      expect(WebDavUtils.removeHostFromURL('https://test.com/folder1/folder2/folder3/')).to.be.equal(
        '/folder1/folder2/folder3/',
      );
      expect(WebDavUtils.removeHostFromURL('https://test.com/folder1/test.jpg')).to.be.equal('/folder1/test.jpg');
    });
  });

  describe('getRequestedResource', () => {
    it('When folder request is given, then it should return the requested resource', async () => {
      const request = createWebDavRequestFixture({
        url: '/url/to/folder/',
      });
      const resource = await WebDavUtils.getRequestedResource(request);
      expect(resource).to.deep.equal({
        url: '/url/to/folder/',
        type: 'folder',
        name: 'folder',
        parentPath: '/url/to/',
        path: {
          base: 'folder',
          dir: '/url/to',
          ext: '',
          name: 'folder',
          root: '/',
        },
      });
    });

    it('When folder url is given, then it should generate the requested resource', async () => {
      const requestURL = '/url/to/folder/';
      const resource = await WebDavUtils.getRequestedResource(requestURL);
      expect(resource).to.deep.equal({
        url: '/url/to/folder/',
        type: 'folder',
        name: 'folder',
        parentPath: '/url/to/',
        path: {
          base: 'folder',
          dir: '/url/to',
          ext: '',
          name: 'folder',
          root: '/',
        },
      });
    });

    it('When file request is given, then it should generate the requested resource', async () => {
      const request = createWebDavRequestFixture({
        url: '/url/to/test.png',
      });
      const resource = await WebDavUtils.getRequestedResource(request);
      expect(resource).to.deep.equal({
        url: '/url/to/test.png',
        type: 'file',
        name: 'test',
        parentPath: '/url/to/',
        path: {
          base: 'test.png',
          dir: '/url/to',
          ext: '.png',
          name: 'test',
          root: '/',
        },
      });
    });

    it('When file url is given, then it should generate the requested resource', async () => {
      const requestURL = '/url/to/test.png';
      const resource = await WebDavUtils.getRequestedResource(requestURL);
      expect(resource).to.deep.equal({
        url: '/url/to/test.png',
        type: 'file',
        name: 'test',
        parentPath: '/url/to/',
        path: {
          base: 'test.png',
          dir: '/url/to',
          ext: '.png',
          name: 'test',
          root: '/',
        },
      });
    });
  });

  describe('getDatabaseItemFromResource', () => {
    const requestFileFixture: WebDavRequestedResource = {
      url: '/url/to/test.png',
      type: 'file',
      name: 'test',
      parentPath: '/url/to/',
      path: {
        base: 'test.png',
        dir: '/url/to',
        ext: '.png',
        name: 'test',
        root: '/',
      },
    };
    const requestFolderFixture: WebDavRequestedResource = {
      url: '/url/to/folder/',
      type: 'folder',
      name: 'folder',
      parentPath: '/url/to/',
      path: {
        base: 'folder',
        dir: '/url/to',
        ext: '',
        name: 'folder',
        root: '/',
      },
    };

    it('When folder request is given, then it should return the requested resource', async () => {
      const driveDatabaseManager = getDriveDatabaseManager();
      const folder = getDriveFolderDatabaseFixture();
      const findFolderStub = vi.spyOn(driveDatabaseManager, 'findFolderByRelativePath').mockResolvedValue(folder);
      const findFileStub = vi.spyOn(driveDatabaseManager, 'findFileByRelativePath').mockRejectedValue(new Error());

      const item = await WebDavUtils.getDatabaseItemFromResource(requestFolderFixture, driveDatabaseManager);
      expect(item).to.be.deep.equal(folder.toItem());
      expect(findFolderStub).toHaveBeenCalledOnce();
      expect(findFileStub).not.toHaveBeenCalled();
    });

    it('When file request is given, then it should return the requested resource', async () => {
      const driveDatabaseManager = getDriveDatabaseManager();
      const file = getDriveFileDatabaseFixture();
      const findFileStub = vi.spyOn(driveDatabaseManager, 'findFileByRelativePath').mockResolvedValue(file);
      const findFolderStub = vi.spyOn(driveDatabaseManager, 'findFolderByRelativePath').mockRejectedValue(new Error());

      const item = await WebDavUtils.getDatabaseItemFromResource(requestFileFixture, driveDatabaseManager);
      expect(item).to.be.deep.equal(file.toItem());
      expect(findFileStub).toHaveBeenCalledOnce();
      expect(findFolderStub).not.toHaveBeenCalled();
    });

    it('When file item is not found, then it should return null', async () => {
      const driveDatabaseManager = getDriveDatabaseManager();
      const findFileStub = vi.spyOn(driveDatabaseManager, 'findFileByRelativePath').mockResolvedValue(null);
      const findFolderStub = vi.spyOn(driveDatabaseManager, 'findFolderByRelativePath').mockRejectedValue(new Error());

      const item = await WebDavUtils.getDatabaseItemFromResource(requestFileFixture, driveDatabaseManager);
      expect(item).to.be.equal(null);
      expect(findFileStub).toHaveBeenCalledOnce();
      expect(findFolderStub).not.toHaveBeenCalled();
    });
  });

  describe('setDatabaseItem', () => {
    it('When folder item is saved, then it is persisted to the database', async () => {
      const driveDatabaseManager = getDriveDatabaseManager();
      const expectedFolder = getDriveFolderDatabaseFixture();
      const createFolderStub = vi.spyOn(driveDatabaseManager, 'createFolder').mockResolvedValue(expectedFolder);
      const createFileStub = vi.spyOn(driveDatabaseManager, 'createFile').mockRejectedValue(new Error());

      const driveFolder = await WebDavUtils.setDatabaseItem(
        'folder',
        newFolderItem(),
        driveDatabaseManager,
        'relative-path',
      );
      expect(driveFolder).to.be.deep.equal(expectedFolder);
      expect(createFolderStub).toHaveBeenCalledOnce();
      expect(createFileStub).not.toHaveBeenCalled();
    });

    it('When file item is saved, then it is persisted to the database', async () => {
      const driveDatabaseManager = getDriveDatabaseManager();
      const expectedFile = getDriveFileDatabaseFixture();
      const createFileStub = vi.spyOn(driveDatabaseManager, 'createFile').mockResolvedValue(expectedFile);
      const createFolderStub = vi.spyOn(driveDatabaseManager, 'createFolder').mockRejectedValue(new Error());

      const driveFile = await WebDavUtils.setDatabaseItem('file', newFileItem(), driveDatabaseManager, 'relative-path');
      expect(driveFile).to.be.deep.equal(expectedFile);
      expect(createFileStub).toHaveBeenCalledOnce();
      expect(createFolderStub).not.toHaveBeenCalled();
    });
  });

  describe('getDriveItemFromResource', () => {
    const requestFileFixture: WebDavRequestedResource = {
      url: '/url/to/test.png',
      type: 'file',
      name: 'test',
      parentPath: '/url/to/',
      path: {
        base: 'test.png',
        dir: '/url/to',
        ext: '.png',
        name: 'test',
        root: '/',
      },
    };
    const requestFolderFixture: WebDavRequestedResource = {
      url: '/url/to/folder/',
      type: 'folder',
      name: 'folder',
      parentPath: '/url/to/',
      path: {
        base: 'folder',
        dir: '/url/to',
        ext: '',
        name: 'folder',
        root: '/',
      },
    };

    it('When folder resource is looked by its path, then it is returned', async () => {
      const expectedFolder = newFolderItem();
      const findFolderStub = vi
        .spyOn(DriveFolderService.instance, 'getFolderMetadataByPath')
        .mockResolvedValue(expectedFolder);
      const findFileStub = vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockRejectedValue(new Error());

      const driveFolderItem = await WebDavUtils.getDriveItemFromResource(
        requestFolderFixture,
        DriveFolderService.instance,
        undefined,
      );
      expect(driveFolderItem).to.be.deep.equal(expectedFolder);
      expect(findFolderStub).toHaveBeenCalledOnce();
      expect(findFileStub).not.toHaveBeenCalled();
    });

    it('When file resource is looked by its path, then it is returned', async () => {
      const expectedFile = newFileItem();
      const findFileStub = vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockResolvedValue(expectedFile);
      const findFolderStub = vi
        .spyOn(DriveFolderService.instance, 'getFolderMetadataByPath')
        .mockRejectedValue(new Error());

      const driveFileItem = await WebDavUtils.getDriveItemFromResource(
        requestFileFixture,
        undefined,
        DriveFileService.instance,
      );
      expect(driveFileItem).to.be.deep.equal(expectedFile);
      expect(findFileStub).toHaveBeenCalledOnce();
      expect(findFolderStub).not.toHaveBeenCalled();
    });
  });

  describe('getAndSearchItemFromResource', () => {
    const requestFileFixture: WebDavRequestedResource = {
      url: '/url/to/test.png',
      type: 'file',
      name: 'test',
      parentPath: '/url/to/',
      path: {
        base: 'test.png',
        dir: '/url/to',
        ext: '.png',
        name: 'test',
        root: '/',
      },
    };
    const requestFolderFixture: WebDavRequestedResource = {
      url: '/url/to/folder/',
      type: 'folder',
      name: 'folder',
      parentPath: '/url/to/',
      path: {
        base: 'folder',
        dir: '/url/to',
        ext: '',
        name: 'folder',
        root: '/',
      },
    };

    it('When folder item exists in the local db, then it is returned from db', async () => {
      const driveDatabaseManager = getDriveDatabaseManager();
      const expectedFolder = newFolderItem();
      const findFolderStub = vi.spyOn(WebDavUtils, 'getDatabaseItemFromResource').mockResolvedValue(expectedFolder);
      const findFolderOnDriveStub = vi.spyOn(WebDavUtils, 'getDriveItemFromResource').mockRejectedValue(new Error());
      const saveFolderOnLocalStub = vi.spyOn(WebDavUtils, 'setDatabaseItem').mockRejectedValue(new Error());

      const driveFolderItem = await WebDavUtils.getAndSearchItemFromResource({
        resource: requestFolderFixture,
        driveDatabaseManager,
      });
      expect(driveFolderItem).to.be.deep.equal(expectedFolder);
      expect(findFolderStub).toHaveBeenCalledOnce();
      expect(findFolderOnDriveStub).not.toHaveBeenCalled();
      expect(saveFolderOnLocalStub).not.toHaveBeenCalled();
    });

    it('When file item exists in the local db, then it is returned from db', async () => {
      const driveDatabaseManager = getDriveDatabaseManager();
      const expectedFile = newFileItem();
      const findFileStub = vi.spyOn(WebDavUtils, 'getDatabaseItemFromResource').mockResolvedValue(expectedFile);
      const findFileOnDriveStub = vi.spyOn(WebDavUtils, 'getDriveItemFromResource').mockRejectedValue(new Error());
      const saveFileOnLocalStub = vi.spyOn(WebDavUtils, 'setDatabaseItem').mockRejectedValue(new Error());

      const driveFolderItem = await WebDavUtils.getAndSearchItemFromResource({
        resource: requestFileFixture,
        driveDatabaseManager,
      });
      expect(driveFolderItem).to.be.deep.equal(expectedFile);
      expect(findFileStub).toHaveBeenCalledOnce();
      expect(findFileOnDriveStub).not.toHaveBeenCalled();
      expect(saveFileOnLocalStub).not.toHaveBeenCalled();
    });

    it('When folder item does not exist in the local db, then it is returned from drive', async () => {
      const driveDatabaseManager = getDriveDatabaseManager();
      const expectedFolder = newFolderItem();
      const findFolderStub = vi.spyOn(WebDavUtils, 'getDatabaseItemFromResource').mockResolvedValue(null);
      const findFolderOnDriveStub = vi.spyOn(WebDavUtils, 'getDriveItemFromResource').mockResolvedValue(expectedFolder);
      const saveFolderOnLocalStub = vi.spyOn(WebDavUtils, 'setDatabaseItem').mockResolvedValue(undefined);

      const driveFolderItem = await WebDavUtils.getAndSearchItemFromResource({
        resource: requestFolderFixture,
        driveDatabaseManager,
      });
      expect(driveFolderItem).to.be.deep.equal(expectedFolder);
      expect(findFolderStub).toHaveBeenCalledOnce();
      expect(findFolderOnDriveStub).toHaveBeenCalledOnce();
      expect(saveFolderOnLocalStub).toHaveBeenCalledOnce();
    });

    it('When file item does not exist in the local db, then it is returned from drive', async () => {
      const driveDatabaseManager = getDriveDatabaseManager();
      const expectedFile = newFileItem();
      const findFileStub = vi.spyOn(WebDavUtils, 'getDatabaseItemFromResource').mockResolvedValue(null);
      const findFileOnDriveStub = vi.spyOn(WebDavUtils, 'getDriveItemFromResource').mockResolvedValue(expectedFile);
      const saveFileOnLocalStub = vi.spyOn(WebDavUtils, 'setDatabaseItem').mockResolvedValue(undefined);

      const driveFolderItem = await WebDavUtils.getAndSearchItemFromResource({
        resource: requestFileFixture,
        driveDatabaseManager,
      });
      expect(driveFolderItem).to.be.deep.equal(expectedFile);
      expect(findFileStub).toHaveBeenCalledOnce();
      expect(findFileOnDriveStub).toHaveBeenCalledOnce();
      expect(saveFileOnLocalStub).toHaveBeenCalledOnce();
    });

    it('When file does not exist in the local db nor drive, then a not found error is thrown', async () => {
      const driveDatabaseManager = getDriveDatabaseManager();
      const findItemStub = vi.spyOn(WebDavUtils, 'getDatabaseItemFromResource').mockResolvedValue(null);
      const findItemOnDriveStub = vi.spyOn(WebDavUtils, 'getDriveItemFromResource').mockResolvedValue(undefined);
      const saveItemOnLocalStub = vi.spyOn(WebDavUtils, 'setDatabaseItem').mockRejectedValue(new Error());

      try {
        await WebDavUtils.getAndSearchItemFromResource({ resource: requestFileFixture, driveDatabaseManager });
        fail('Expected function to throw an error, but it did not.');
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
      expect(findItemStub).toHaveBeenCalledOnce();
      expect(findItemOnDriveStub).toHaveBeenCalledOnce();
      expect(saveItemOnLocalStub).not.toHaveBeenCalled();
    });
  });
});
