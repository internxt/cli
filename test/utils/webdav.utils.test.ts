import { describe, expect, it, vi } from 'vitest';
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
      const findFolderStub = vi.spyOn(DriveItemService.instance, 'getFolderByPath').mockResolvedValue(expectedFolder);
      const findFileStub = vi.spyOn(DriveItemService.instance, 'getFileByPath').mockRejectedValue(new Error());

      const driveFolderItem = await WebDavUtils.getDriveItemFromResource(requestFolderFixture);
      expect(driveFolderItem).to.be.deep.equal(expectedFolder);
      expect(findFolderStub).toHaveBeenCalledOnce();
      expect(findFileStub).not.toHaveBeenCalled();
    });

    it('When folder is not found, then it returns undefined', async () => {
      const findFolderStub = vi
        .spyOn(DriveItemService.instance, 'getFolderByPath')
        .mockRejectedValue(new Error('Folder not found'));

      const item = await WebDavUtils.getDriveItemFromResource(requestFolderFixture);
      expect(findFolderStub).toHaveBeenCalledOnce();
      expect(item).toBeUndefined();
    });

    it('When file resource is looked by its path, then it is returned', async () => {
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
    it('When the file exists, then it should return the file item', async () => {
      const expectedFile = newFileItem();
      vi.spyOn(DriveItemService.instance, 'getFileByPath').mockResolvedValue(expectedFile);

      const result = await WebDavUtils.getDriveFileFromResource('/path/to/file.txt');

      expect(result).toBe(expectedFile);
    });

    it('When the file does not exist, then it should return undefined', async () => {
      vi.spyOn(DriveItemService.instance, 'getFileByPath').mockRejectedValue(new Error('Not found'));

      const result = await WebDavUtils.getDriveFileFromResource('/path/to/nonexistent.txt');

      expect(result).toBeUndefined();
    });
  });

  describe('getDriveFolderFromResource', () => {
    it('When the folder exists, then it should return the folder item', async () => {
      const expectedFolder = newFolderItem();
      vi.spyOn(DriveItemService.instance, 'getFolderByPath').mockResolvedValue(expectedFolder);

      const result = await WebDavUtils.getDriveFolderFromResource('/path/to/folder/');

      expect(result).toBe(expectedFolder);
    });

    it('When the folder does not exist, then it should return undefined', async () => {
      vi.spyOn(DriveItemService.instance, 'getFolderByPath').mockRejectedValue(new Error('Not found'));

      const result = await WebDavUtils.getDriveFolderFromResource('/path/to/nonexistent/');

      expect(result).toBeUndefined();
    });
  });

  describe('deleteOrTrashItem', () => {
    it('should delete file permanently and clear cache when deleteFilesPermanently is true', async () => {
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

    it('should delete folder permanently and clear cache when deleteFilesPermanently is true', async () => {
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

    it('When deleteFilesPermanently is false for a file, then it should trash the file and clear cache', async () => {
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

    it('should trash folder and clear cache when deleteFilesPermanently is false', async () => {
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
