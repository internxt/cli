import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  createWebDavRequestFixture,
  createWebDavResponseFixture,
  getRequestedFileResource,
  getRequestedFolderResource,
} from '../../fixtures/webdav.fixture';
import { MOVERequestHandler } from '../../../src/webdav/handlers/MOVE.handler';
import { WebDavUtils } from '../../../src/utils/webdav.utils';
import { DriveFolderService } from '../../../src/services/drive/drive-folder.service';
import { DriveFileService } from '../../../src/services/drive/drive-file.service';
import { WebDavFolderService } from '../../../src/services/webdav/webdav-folder.service';
import { DriveItemRepository } from '../../../src/services/database/drive-item/drive-item.repository';
import { newFolderItem, newFileItem } from '../../fixtures/drive.fixture';

describe('MOVE request handler', () => {
  let sut: MOVERequestHandler;

  beforeEach(() => {
    sut = new MOVERequestHandler();
  });

  test('when no destination is specified, then the server returns an error', async () => {
    const request = createWebDavRequestFixture({
      method: 'MOVE',
      url: '/source/file.txt',
    });
    const response = createWebDavResponseFixture({});

    await expect(sut.handle(request, response)).rejects.toThrow('Destination folder not received');
  });

  test('when the source item is not found, then the server returns an error', async () => {
    const request = createWebDavRequestFixture({
      method: 'MOVE',
      url: '/source/file.txt',
      header: vi.fn().mockReturnValue('https://example.com/dest/file.txt'),
    });
    const response = createWebDavResponseFixture({});

    vi.spyOn(WebDavUtils, 'getRequestedResource').mockResolvedValue(
      getRequestedFileResource({ parentFolder: '/source/', fileName: 'file', fileType: 'txt' }),
    );
    vi.spyOn(WebDavUtils, 'getDriveItemFromResource').mockResolvedValue(undefined);

    await expect(sut.handle(request, response)).rejects.toThrow('Resource not found on Internxt Drive');
  });

  test('when a folder is moved within the same directory, then the server renames it', async () => {
    const folderItem = newFolderItem({ uuid: 'folder-uuid' });
    const request = createWebDavRequestFixture({
      method: 'MOVE',
      url: '/source/folder/',
      header: vi.fn().mockReturnValue('/source/renamed/'),
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    vi.spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValueOnce(getRequestedFolderResource({ parentFolder: '/source/', folderName: 'folder' }))
      .mockResolvedValueOnce(getRequestedFolderResource({ parentFolder: '/source/', folderName: 'renamed' }));
    vi.spyOn(WebDavUtils, 'removeHostFromURL').mockReturnValue('/source/renamed/');
    vi.spyOn(WebDavUtils, 'getDriveItemFromResource').mockResolvedValue(folderItem);
    const renameFolderStub = vi.spyOn(DriveFolderService.instance, 'renameFolder').mockResolvedValue(undefined);
    const deleteSpy = vi.spyOn(DriveItemRepository.instance, 'delete').mockResolvedValue(undefined);
    const createOrUpdateSpy = vi.spyOn(DriveItemRepository.instance, 'createOrUpdate').mockResolvedValue(undefined);

    await sut.handle(request, response);

    expect(renameFolderStub).toHaveBeenCalledWith({ folderUuid: 'folder-uuid', name: 'renamed' });
    expect(deleteSpy).toHaveBeenCalledWith(['folder-uuid']);
    expect(createOrUpdateSpy).toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(204);
  });

  test('when a file is moved within the same directory, then the server renames it', async () => {
    const fileItem = newFileItem({ uuid: 'file-uuid' });
    const request = createWebDavRequestFixture({
      method: 'MOVE',
      url: '/source/file.txt',
      header: vi.fn().mockReturnValue('/source/renamed.txt'),
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    vi.spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValueOnce(getRequestedFileResource({ parentFolder: '/source/', fileName: 'file', fileType: 'txt' }))
      .mockResolvedValueOnce(
        getRequestedFileResource({ parentFolder: '/source/', fileName: 'renamed', fileType: 'txt' }),
      );
    vi.spyOn(WebDavUtils, 'removeHostFromURL').mockReturnValue('/source/renamed.txt');
    vi.spyOn(WebDavUtils, 'getDriveItemFromResource').mockResolvedValue(fileItem);
    const renameFileStub = vi.spyOn(DriveFileService.instance, 'renameFile').mockResolvedValue(undefined);
    const deleteSpy = vi.spyOn(DriveItemRepository.instance, 'delete').mockResolvedValue(undefined);
    const createOrUpdateSpy = vi.spyOn(DriveItemRepository.instance, 'createOrUpdate').mockResolvedValue(undefined);

    await sut.handle(request, response);

    expect(renameFileStub).toHaveBeenCalledWith('file-uuid', { plainName: 'renamed', type: 'txt' });
    expect(deleteSpy).toHaveBeenCalledWith(['file-uuid']);
    expect(createOrUpdateSpy).toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(204);
  });

  test('when a folder is moved to a different directory, then the server processes the move', async () => {
    const folderItem = newFolderItem({ uuid: 'folder-uuid' });
    const destFolderItem = newFolderItem({ uuid: 'dest-folder-uuid' });
    const request = createWebDavRequestFixture({
      method: 'MOVE',
      url: '/source/folder/',
      header: vi.fn().mockReturnValue('https://example.com/dest/folder/'),
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    vi.spyOn(WebDavUtils, 'removeHostFromURL').mockReturnValue('/dest/folder/');
    vi.spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValueOnce(getRequestedFolderResource({ parentFolder: '/source/', folderName: 'folder' }))
      .mockResolvedValueOnce(getRequestedFolderResource({ parentFolder: '/dest/', folderName: 'folder' }));
    vi.spyOn(WebDavUtils, 'getDriveItemFromResource').mockResolvedValue(folderItem);
    vi.spyOn(WebDavFolderService.instance, 'getDriveFolderItemFromPath').mockResolvedValue(destFolderItem);
    const moveFolderStub = vi.spyOn(DriveFolderService.instance, 'moveFolder').mockResolvedValue(undefined);
    const deleteSpy = vi.spyOn(DriveItemRepository.instance, 'delete').mockResolvedValue(undefined);
    const createOrUpdateSpy = vi.spyOn(DriveItemRepository.instance, 'createOrUpdate').mockResolvedValue(undefined);

    await sut.handle(request, response);

    expect(moveFolderStub).toHaveBeenCalledWith('folder-uuid', {
      destinationFolder: 'dest-folder-uuid',
      name: 'folder',
    });
    expect(deleteSpy).toHaveBeenCalledWith(['folder-uuid']);
    expect(createOrUpdateSpy).toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(204);
  });

  test('when a file is moved to a different directory, then the server processes the move', async () => {
    const fileItem = newFileItem({ uuid: 'file-uuid' });
    const destFolderItem = newFolderItem({ uuid: 'dest-folder-uuid' });
    const request = createWebDavRequestFixture({
      method: 'MOVE',
      url: '/source/file.txt',
      header: vi.fn().mockReturnValue('https://example.com/dest/file.txt'),
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    vi.spyOn(WebDavUtils, 'removeHostFromURL').mockReturnValue('/dest/file.txt');
    vi.spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValueOnce(getRequestedFileResource({ parentFolder: '/source/', fileName: 'file', fileType: 'txt' }))
      .mockResolvedValueOnce(getRequestedFileResource({ parentFolder: '/dest/', fileName: 'file', fileType: 'txt' }));
    vi.spyOn(WebDavUtils, 'getDriveItemFromResource').mockResolvedValue(fileItem);
    vi.spyOn(WebDavFolderService.instance, 'getDriveFolderItemFromPath').mockResolvedValue(destFolderItem);
    const moveFileStub = vi.spyOn(DriveFileService.instance, 'moveFile').mockResolvedValue(undefined);
    const deleteSpy = vi.spyOn(DriveItemRepository.instance, 'delete').mockResolvedValue(undefined);
    const createOrUpdateSpy = vi.spyOn(DriveItemRepository.instance, 'createOrUpdate').mockResolvedValue(undefined);

    await sut.handle(request, response);

    expect(moveFileStub).toHaveBeenCalledWith('file-uuid', {
      destinationFolder: 'dest-folder-uuid',
      name: 'file',
      type: 'txt',
    });
    expect(deleteSpy).toHaveBeenCalledWith(['file-uuid']);
    expect(createOrUpdateSpy).toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(204);
  });
});
