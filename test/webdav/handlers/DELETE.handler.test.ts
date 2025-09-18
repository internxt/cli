import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail } from 'node:assert';
import { DELETERequestHandler } from '../../../src/webdav/handlers/DELETE.handler';
import {
  createWebDavRequestFixture,
  createWebDavResponseFixture,
  getRequestedFileResource,
  getRequestedFolderResource,
} from '../../fixtures/webdav.fixture';
import { TrashService } from '../../../src/services/drive/trash.service';
import { NotFoundError } from '../../../src/utils/errors.utils';
import { DriveFileService } from '../../../src/services/drive/drive-file.service';
import { DriveFolderService } from '../../../src/services/drive/drive-folder.service';
import { WebDavUtils } from '../../../src/utils/webdav.utils';
import { newFileItem, newFolderItem } from '../../fixtures/drive.fixture';
import { WebDavRequestedResource } from '../../../src/types/webdav.types';

describe('DELETE request handler', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When the item does not exist, it should reply with a 404 error', async () => {
    const requestHandler = new DELETERequestHandler({
      trashService: TrashService.instance,
      driveFileService: DriveFileService.instance,
      driveFolderService: DriveFolderService.instance,
    });

    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();

    const request = createWebDavRequestFixture({
      method: 'DELETE',
      url: requestedFileResource.url,
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    const getRequestedResourceStub = vi
      .spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValue(requestedFileResource);
    const getAndSearchItemFromResourceStub = vi
      .spyOn(WebDavUtils, 'getDriveItemFromResource')
      .mockResolvedValue(undefined);

    try {
      await requestHandler.handle(request, response);
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect(error).to.be.instanceOf(NotFoundError);
    }
    expect(getRequestedResourceStub).toHaveBeenCalledOnce();
    expect(getAndSearchItemFromResourceStub).toHaveBeenCalledOnce();
  });

  it('When the file exists, then it should reply with a 204 response', async () => {
    const trashService = TrashService.instance;
    const requestHandler = new DELETERequestHandler({
      trashService,
      driveFileService: DriveFileService.instance,
      driveFolderService: DriveFolderService.instance,
    });
    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();
    const request = createWebDavRequestFixture({
      method: 'DELETE',
      url: requestedFileResource.url,
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    const mockFile = newFileItem();

    const getRequestedResourceStub = vi
      .spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValue(requestedFileResource);
    const getAndSearchItemFromResourceStub = vi
      .spyOn(WebDavUtils, 'getDriveItemFromResource')
      .mockResolvedValue(mockFile);
    const trashItemsStub = vi.spyOn(trashService, 'trashItems').mockResolvedValue();

    await requestHandler.handle(request, response);
    expect(response.status).toHaveBeenCalledWith(204);
    expect(getRequestedResourceStub).toHaveBeenCalledOnce();
    expect(getAndSearchItemFromResourceStub).toHaveBeenCalledOnce();
    expect(trashItemsStub).toHaveBeenCalledWith({ items: [{ type: 'file', uuid: mockFile.uuid, id: null }] });
  });

  it('When folder exists, then it should reply with a 204 response', async () => {
    const trashService = TrashService.instance;
    const requestHandler = new DELETERequestHandler({
      trashService,
      driveFileService: DriveFileService.instance,
      driveFolderService: DriveFolderService.instance,
    });
    const requestedFolderResource: WebDavRequestedResource = getRequestedFolderResource();

    const request = createWebDavRequestFixture({
      method: 'DELETE',
      url: requestedFolderResource.url,
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    const mockFolder = newFolderItem();

    const getRequestedResourceStub = vi
      .spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValue(requestedFolderResource);
    const getAndSearchItemFromResourceStub = vi
      .spyOn(WebDavUtils, 'getDriveItemFromResource')
      .mockResolvedValue(mockFolder);
    const trashItemsStub = vi.spyOn(trashService, 'trashItems').mockResolvedValue();

    await requestHandler.handle(request, response);
    expect(response.status).toHaveBeenCalledWith(204);
    expect(getRequestedResourceStub).toHaveBeenCalledOnce();
    expect(getAndSearchItemFromResourceStub).toHaveBeenCalledOnce();
    expect(trashItemsStub).toHaveBeenCalledWith({ items: [{ type: 'folder', uuid: mockFolder.uuid, id: null }] });
  });
});
