import { beforeEach, describe, expect, it, vi } from 'vitest';
import { HEADRequestHandler } from '../../../src/webdav/handlers/HEAD.handler';
import {
  createWebDavRequestFixture,
  createWebDavResponseFixture,
  getRequestedFileResource,
  getRequestedFolderResource,
} from '../../fixtures/webdav.fixture';
import { DriveItemService } from '../../../src/services/drive/drive-item.service';
import { WebDavRequestedResource } from '../../../src/types/webdav.types';
import { newFileItem, newFolderItem } from '../../fixtures/drive.fixture';
import { WebDavUtils } from '../../../src/utils/webdav.utils';
import { randomInt } from 'crypto';

describe('HEAD request handler', () => {
  let sut: HEADRequestHandler;

  beforeEach(() => {
    sut = new HEADRequestHandler();
  });

  it('When a folder is requested, it should reply with a 200', async () => {
    const requestedFolderResource: WebDavRequestedResource = getRequestedFolderResource();
    const request = createWebDavRequestFixture({
      method: 'HEAD',
      url: requestedFolderResource.url,
      headers: {},
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    const mockFolder = newFolderItem();

    vi.spyOn(DriveItemService.instance, 'getFileByPath').mockRejectedValue(new Error());
    const getRequestedResourceStub = vi
      .spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValue(requestedFolderResource);
    const getFolderMetadataStub = vi.spyOn(DriveItemService.instance, 'getFolderByPath').mockResolvedValue(mockFolder);

    await sut.handle(request, response);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(getRequestedResourceStub).toHaveBeenCalledOnce();
    expect(getFolderMetadataStub).toHaveBeenCalledOnce();
  });

  it('When a file is requested, it should reply with a 200 with the correct headers', async () => {
    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();

    const request = createWebDavRequestFixture({
      method: 'HEAD',
      url: requestedFileResource.url,
      headers: {},
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
      header: vi.fn(),
    });

    const mockFile = newFileItem();

    const getRequestedResourceStub = vi
      .spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValue(requestedFileResource);
    const getFileMetadataStub = vi.spyOn(DriveItemService.instance, 'getFileByPath').mockResolvedValue(mockFile);

    await sut.handle(request, response);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.header).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
    expect(response.header).toHaveBeenCalledWith('Content-length', mockFile.size.toString());
    expect(getRequestedResourceStub).toHaveBeenCalledOnce();
    expect(getFileMetadataStub).toHaveBeenCalledOnce();
  });

  it('When a file is requested with range-request, it should reply with a 200 with the correct headers', async () => {
    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();

    const mockSize = randomInt(500, 10000);
    const mockFile = newFileItem({ size: mockSize });
    const rangeStart = randomInt(0, 450);

    const request = createWebDavRequestFixture({
      method: 'HEAD',
      url: requestedFileResource.url,
      headers: {
        range: `bytes=${rangeStart}-${mockSize}`,
      },
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
      header: vi.fn(),
    });

    const getRequestedResourceStub = vi
      .spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValue(requestedFileResource);
    const getFileMetadataStub = vi.spyOn(DriveItemService.instance, 'getFileByPath').mockResolvedValue(mockFile);

    await sut.handle(request, response);
    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.header).toHaveBeenCalledWith('Content-length', (mockSize - rangeStart).toString());
    expect(response.header).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
    expect(getRequestedResourceStub).toHaveBeenCalledOnce();
    expect(getFileMetadataStub).toHaveBeenCalledOnce();
  });
});
