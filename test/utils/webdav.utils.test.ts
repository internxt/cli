import { beforeEach, describe, expect, it, vi } from 'vitest';
import { WebDavUtils } from '../../src/utils/webdav.utils';
import { createWebDavRequestFixture } from '../fixtures/webdav.fixture';
import { WebDavRequestedResource } from '../../src/types/webdav.types';
import { newFileItem, newFolderItem } from '../fixtures/drive.fixture';
import { DriveFolderService } from '../../src/services/drive/drive-folder.service';
import { DriveFileService } from '../../src/services/drive/drive-file.service';
import { fail } from 'node:assert';
import { ConflictError, NotFoundError } from '../../src/utils/errors.utils';
import AppError from '@internxt/sdk/dist/shared/types/errors';

describe('Webdav utils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('joinURL', () => {
    it('When a list of path components are given, then it should generate a correct href', () => {
      const href = WebDavUtils.joinURL('/path', 'to', 'file');
      expect(href).to.be.equal('/path/to/file');
    });

    it('When a list of path components are given, then it should remove incorrect characters', () => {
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

    it('When folder is not found, then it throws ConflictError', async () => {
      const findFolderStub = vi
        .spyOn(DriveFolderService.instance, 'getFolderMetadataByPath')
        .mockRejectedValue(new AppError('Folder not found', 404));
      const findFileStub = vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockRejectedValue(new Error());

      try {
        await WebDavUtils.getDriveItemFromResource(requestFolderFixture, DriveFolderService.instance, undefined);
        fail('Expected function to throw an error, but it did not.');
      } catch (error) {
        expect(error).to.be.instanceOf(ConflictError);
      }

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

    it('When folder item does exist, then it is returned from drive', async () => {
      const expectedFolder = newFolderItem();
      const findFolderOnDriveStub = vi.spyOn(WebDavUtils, 'getDriveItemFromResource').mockResolvedValue(expectedFolder);

      const driveFolderItem = await WebDavUtils.getAndSearchItemFromResource({ resource: requestFolderFixture });
      expect(driveFolderItem).to.be.deep.equal(expectedFolder);
      expect(findFolderOnDriveStub).toHaveBeenCalledOnce();
    });

    it('When file item does exist, then it is returned from drive', async () => {
      const expectedFile = newFileItem();
      const findFileOnDriveStub = vi.spyOn(WebDavUtils, 'getDriveItemFromResource').mockResolvedValue(expectedFile);

      const driveFolderItem = await WebDavUtils.getAndSearchItemFromResource({ resource: requestFileFixture });
      expect(driveFolderItem).to.be.deep.equal(expectedFile);
      expect(findFileOnDriveStub).toHaveBeenCalledOnce();
    });

    it('When file does not exist, then a not found error is thrown', async () => {
      const findItemOnDriveStub = vi.spyOn(WebDavUtils, 'getDriveItemFromResource').mockResolvedValue(undefined);

      try {
        await WebDavUtils.getAndSearchItemFromResource({ resource: requestFileFixture });
        fail('Expected function to throw an error, but it did not.');
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
      expect(findItemOnDriveStub).toHaveBeenCalledOnce();
    });
  });
});
