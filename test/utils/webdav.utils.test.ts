import { describe, expect, test, vi } from 'vitest';
import { WebDavUtils } from '../../src/utils/webdav.utils';
import { WebDavRequestedResource } from '../../src/types/webdav.types';
import { newFileItem, newFolderItem } from '../fixtures/drive.fixture';
import { DriveItemService } from '../../src/services/drive/drive-item.service';
import { DriveItemRepository } from '../../src/services/database/drive-item/drive-item.repository';
import { ConfigService } from '../../src/services/config.service';
import { TrashService } from '../../src/services/drive/trash.service';
import { getWebdavConfigMock } from '../fixtures/webdav.fixture';

describe('Webdav utils', () => {
  describe('joinURL', () => {
    test('when path components are given, then a correct URL is generated', () => {
      const href = WebDavUtils.joinURL('/path', 'to', 'file');
      expect(href).to.be.equal('/path/to/file');
    });

    test('when path components contain trailing slashes, then they are handled correctly', () => {
      const href = WebDavUtils.joinURL('/path', 'to', 'folder/');
      expect(href).to.be.equal('/path/to/folder/');
    });
  });

  describe('removeHostFromURL', () => {
    test('when a URL with a host is given, then the host is removed', () => {
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
    test('when a folder URL is given, then the requested resource is created', async () => {
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

    test('when a file URL is given, then the requested resource is created', async () => {
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

    test('when a folder is looked up by path, then it is returned', async () => {
      const expectedFolder = newFolderItem();
      const findFolderStub = vi.spyOn(DriveItemService.instance, 'getFolderByPath').mockResolvedValue(expectedFolder);
      const findFileStub = vi.spyOn(DriveItemService.instance, 'getFileByPath').mockRejectedValue(new Error());

      const driveFolderItem = await WebDavUtils.getDriveItemFromResource(requestFolderFixture);
      expect(driveFolderItem).to.be.deep.equal(expectedFolder);
      expect(findFolderStub).toHaveBeenCalledOnce();
      expect(findFileStub).not.toHaveBeenCalled();
    });

    test('when a folder is not found, then undefined is returned', async () => {
      const findFolderStub = vi
        .spyOn(DriveItemService.instance, 'getFolderByPath')
        .mockRejectedValue(new Error('Folder not found'));

      const item = await WebDavUtils.getDriveItemFromResource(requestFolderFixture);
      expect(findFolderStub).toHaveBeenCalledOnce();
      expect(item).toBeUndefined();
    });

    test('when a file is looked up by path, then it is returned', async () => {
      const expectedFile = newFileItem();
      const findFileStub = vi.spyOn(DriveItemService.instance, 'getFileByPath').mockResolvedValue(expectedFile);
      const findFolderStub = vi.spyOn(DriveItemService.instance, 'getFolderByPath').mockRejectedValue(new Error());

      const driveFileItem = await WebDavUtils.getDriveItemFromResource(requestFileFixture);
      expect(driveFileItem).to.be.deep.equal(expectedFile);
      expect(findFileStub).toHaveBeenCalledOnce();
      expect(findFolderStub).not.toHaveBeenCalled();
    });
  });

  describe('getDriveFileFromResource', () => {
    test('when the file exists, then the file item is returned', async () => {
      const expectedFile = newFileItem();
      vi.spyOn(DriveItemService.instance, 'getFileByPath').mockResolvedValue(expectedFile);

      const result = await WebDavUtils.getDriveFileFromResource('/path/to/file.txt');

      expect(result).toBe(expectedFile);
    });

    test('when the file does not exist, then undefined is returned', async () => {
      vi.spyOn(DriveItemService.instance, 'getFileByPath').mockRejectedValue(new Error('Not found'));

      const result = await WebDavUtils.getDriveFileFromResource('/path/to/nonexistent.txt');

      expect(result).toBeUndefined();
    });
  });

  describe('getDriveFolderFromResource', () => {
    test('when the folder exists, then the folder item is returned', async () => {
      const expectedFolder = newFolderItem();
      vi.spyOn(DriveItemService.instance, 'getFolderByPath').mockResolvedValue(expectedFolder);

      const result = await WebDavUtils.getDriveFolderFromResource('/path/to/folder/');

      expect(result).toBe(expectedFolder);
    });

    test('when the folder does not exist, then undefined is returned', async () => {
      vi.spyOn(DriveItemService.instance, 'getFolderByPath').mockRejectedValue(new Error('Not found'));

      const result = await WebDavUtils.getDriveFolderFromResource('/path/to/nonexistent/');

      expect(result).toBeUndefined();
    });
  });

  describe('deleteOrTrashItem', () => {
    test('when permanent deletion is enabled for files, then files are deleted permanently and cache is cleared', async () => {
      const fileItem = newFileItem();
      vi.spyOn(ConfigService.instance, 'readWebdavConfig').mockResolvedValue(
        getWebdavConfigMock({ deleteFilesPermanently: true }),
      );
      const deleteItemPermanentlyStub = vi.spyOn(TrashService.instance, 'deleteItemPermanently').mockResolvedValue();
      const trashItemsStub = vi.spyOn(TrashService.instance, 'trashItems').mockResolvedValue();
      const deleteCacheSpy = vi.spyOn(DriveItemRepository.instance, 'delete').mockResolvedValue(undefined);

      await WebDavUtils.deleteOrTrashItem(fileItem);

      expect(deleteItemPermanentlyStub).toHaveBeenCalledWith('file', fileItem.uuid);
      expect(trashItemsStub).not.toHaveBeenCalled();
      expect(deleteCacheSpy).toHaveBeenCalledWith([fileItem.uuid]);
    });

    test('when permanent deletion is enabled for folders, then folders are deleted permanently and cache is cleared', async () => {
      const folderItem = newFolderItem();
      vi.spyOn(ConfigService.instance, 'readWebdavConfig').mockResolvedValue(
        getWebdavConfigMock({ deleteFilesPermanently: true }),
      );
      const deleteItemPermanentlyStub = vi.spyOn(TrashService.instance, 'deleteItemPermanently').mockResolvedValue();
      const trashItemsStub = vi.spyOn(TrashService.instance, 'trashItems').mockResolvedValue();
      const deleteCacheSpy = vi.spyOn(DriveItemRepository.instance, 'delete').mockResolvedValue(undefined);

      await WebDavUtils.deleteOrTrashItem(folderItem);

      expect(deleteItemPermanentlyStub).toHaveBeenCalledWith('folder', folderItem.uuid);
      expect(trashItemsStub).not.toHaveBeenCalled();
      expect(deleteCacheSpy).toHaveBeenCalledWith([folderItem.uuid]);
    });

    test('when permanent deletion is disabled for files, then files are trashed and cache is cleared', async () => {
      const fileItem = newFileItem();
      vi.spyOn(ConfigService.instance, 'readWebdavConfig').mockResolvedValue(
        getWebdavConfigMock({ deleteFilesPermanently: false }),
      );
      const deleteItemPermanentlyStub = vi.spyOn(TrashService.instance, 'deleteItemPermanently').mockResolvedValue();
      const trashItemsStub = vi.spyOn(TrashService.instance, 'trashItems').mockResolvedValue();
      const deleteCacheSpy = vi.spyOn(DriveItemRepository.instance, 'delete').mockResolvedValue(undefined);

      await WebDavUtils.deleteOrTrashItem(fileItem);

      expect(trashItemsStub).toHaveBeenCalledWith({
        items: [{ type: 'file', uuid: fileItem.uuid }],
      });
      expect(deleteItemPermanentlyStub).not.toHaveBeenCalled();
      expect(deleteCacheSpy).toHaveBeenCalledWith([fileItem.uuid]);
    });

    test('when permanent deletion is disabled for folders, then folders are trashed and cache is cleared', async () => {
      const folderItem = newFolderItem();
      vi.spyOn(ConfigService.instance, 'readWebdavConfig').mockResolvedValue(
        getWebdavConfigMock({ deleteFilesPermanently: false }),
      );
      const deleteItemPermanentlyStub = vi.spyOn(TrashService.instance, 'deleteItemPermanently').mockResolvedValue();
      const trashItemsStub = vi.spyOn(TrashService.instance, 'trashItems').mockResolvedValue();
      const deleteCacheSpy = vi.spyOn(DriveItemRepository.instance, 'delete').mockResolvedValue(undefined);

      await WebDavUtils.deleteOrTrashItem(folderItem);

      expect(trashItemsStub).toHaveBeenCalledWith({
        items: [{ type: 'folder', uuid: folderItem.uuid }],
      });
      expect(deleteItemPermanentlyStub).not.toHaveBeenCalled();
      expect(deleteCacheSpy).toHaveBeenCalledWith([folderItem.uuid]);
    });
  });
});
