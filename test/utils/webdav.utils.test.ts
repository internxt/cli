import { describe, expect, it, vi } from 'vitest';
import { WebDavUtils } from '../../src/utils/webdav.utils';
import { WebDavRequestedResource } from '../../src/types/webdav.types';
import { newFileItem, newFolderItem } from '../fixtures/drive.fixture';
import { DriveFolderService } from '../../src/services/drive/drive-folder.service';
import { DriveFileService } from '../../src/services/drive/drive-file.service';
import AppError from '@internxt/sdk/dist/shared/types/errors';
import { ConfigService } from '../../src/services/config.service';
import { TrashService } from '../../src/services/drive/trash.service';
import { getWebdavConfigMock } from '../fixtures/webdav.fixture';

describe('Webdav utils', () => {
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
    it('When folder url is given, then it should generate the requested resource', async () => {
      const requestURL = '/url/to/folder/';
      const resource = await WebDavUtils.getRequestedResource(requestURL);
      expect(resource).to.deep.equal({
        url: '/url/to/folder/',
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

    it('When file url is given, then it should generate the requested resource', async () => {
      const requestURL = '/url/to/test.png';
      const resource = await WebDavUtils.getRequestedResource(requestURL);
      expect(resource).to.deep.equal({
        url: '/url/to/test.png',
        name: 'test.png',
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
      name: 'test.png',
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

      const driveFolderItem = await WebDavUtils.getDriveItemFromResource(requestFolderFixture);
      expect(driveFolderItem).to.be.deep.equal(expectedFolder);
      expect(findFolderStub).toHaveBeenCalledOnce();
      expect(findFileStub).not.toHaveBeenCalled();
    });

    it('When folder is not found, then it returns undefined', async () => {
      const findFolderStub = vi
        .spyOn(DriveFolderService.instance, 'getFolderMetadataByPath')
        .mockRejectedValue(new AppError('Folder not found', 404));
      const findFileStub = vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockRejectedValue(new Error());

      const item = await WebDavUtils.getDriveItemFromResource(requestFolderFixture);
      expect(findFolderStub).toHaveBeenCalledOnce();
      expect(findFileStub).not.toHaveBeenCalled();
      expect(item).toBeUndefined();
    });

    it('When file resource is looked by its path, then it is returned', async () => {
      const expectedFile = newFileItem();
      const findFileStub = vi.spyOn(DriveFileService.instance, 'getFileMetadataByPath').mockResolvedValue(expectedFile);
      const findFolderStub = vi
        .spyOn(DriveFolderService.instance, 'getFolderMetadataByPath')
        .mockRejectedValue(new Error());

      const driveFileItem = await WebDavUtils.getDriveItemFromResource(requestFileFixture);
      expect(driveFileItem).to.be.deep.equal(expectedFile);
      expect(findFileStub).toHaveBeenCalledOnce();
      expect(findFolderStub).not.toHaveBeenCalled();
    });
  });

  describe('deleteOrTrashItem', () => {
    it('When deleteFilesPermanently is true for a file, then it should delete permanently', async () => {
      const fileItem = newFileItem();
      vi.spyOn(ConfigService.instance, 'readWebdavConfig').mockResolvedValue(
        getWebdavConfigMock({ deleteFilesPermanently: true }),
      );
      const deleteItemPermanentlyStub = vi.spyOn(TrashService.instance, 'deleteItemPermanently').mockResolvedValue();
      const trashItemsStub = vi.spyOn(TrashService.instance, 'trashItems').mockResolvedValue();

      await WebDavUtils.deleteOrTrashItem(fileItem);

      expect(deleteItemPermanentlyStub).toHaveBeenCalledWith('file', fileItem.uuid);
      expect(trashItemsStub).not.toHaveBeenCalled();
    });

    it('When deleteFilesPermanently is true for a folder, then it should delete permanently', async () => {
      const folderItem = newFolderItem();
      vi.spyOn(ConfigService.instance, 'readWebdavConfig').mockResolvedValue(
        getWebdavConfigMock({ deleteFilesPermanently: true }),
      );
      const deleteItemPermanentlyStub = vi.spyOn(TrashService.instance, 'deleteItemPermanently').mockResolvedValue();
      const trashItemsStub = vi.spyOn(TrashService.instance, 'trashItems').mockResolvedValue();

      await WebDavUtils.deleteOrTrashItem(folderItem);

      expect(deleteItemPermanentlyStub).toHaveBeenCalledWith('folder', folderItem.uuid);
      expect(trashItemsStub).not.toHaveBeenCalled();
    });

    it('When deleteFilesPermanently is false for a file, then it should trash the file', async () => {
      const fileItem = newFileItem();
      vi.spyOn(ConfigService.instance, 'readWebdavConfig').mockResolvedValue(
        getWebdavConfigMock({ deleteFilesPermanently: false }),
      );
      const deleteItemPermanentlyStub = vi.spyOn(TrashService.instance, 'deleteItemPermanently').mockResolvedValue();
      const trashItemsStub = vi.spyOn(TrashService.instance, 'trashItems').mockResolvedValue();

      await WebDavUtils.deleteOrTrashItem(fileItem);

      expect(trashItemsStub).toHaveBeenCalledWith({
        items: [{ type: 'file', uuid: fileItem.uuid }],
      });
      expect(deleteItemPermanentlyStub).not.toHaveBeenCalled();
    });

    it('When deleteFilesPermanently is false for a folder, then it should trash the folder', async () => {
      const folderItem = newFolderItem();
      vi.spyOn(ConfigService.instance, 'readWebdavConfig').mockResolvedValue(
        getWebdavConfigMock({ deleteFilesPermanently: false }),
      );
      const deleteItemPermanentlyStub = vi.spyOn(TrashService.instance, 'deleteItemPermanently').mockResolvedValue();
      const trashItemsStub = vi.spyOn(TrashService.instance, 'trashItems').mockResolvedValue();

      await WebDavUtils.deleteOrTrashItem(folderItem);

      expect(trashItemsStub).toHaveBeenCalledWith({
        items: [{ type: 'folder', uuid: folderItem.uuid }],
      });
      expect(deleteItemPermanentlyStub).not.toHaveBeenCalled();
    });
  });
});
