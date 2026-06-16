import { beforeEach, describe, expect, test, vi } from 'vitest';
import { MKCOLRequestHandler } from '../../../src/webdav/handlers/MKCOL.handler';
import {
  createWebDavRequestFixture,
  createWebDavResponseFixture,
  getRequestedFolderResource,
} from '../../fixtures/webdav.fixture';
import { UserSettingsFixture } from '../../fixtures/auth.fixture';
import { newFolderItem } from '../../fixtures/drive.fixture';
import { WebDavRequestedResource } from '../../../src/types/webdav.types';
import { WebDavUtils } from '../../../src/utils/webdav.utils';
import { AuthService } from '../../../src/services/auth.service';
import { UserCredentialsFixture } from '../../fixtures/login.fixture';
import { WebDavFolderService } from '../../../src/services/webdav/webdav-folder.service';

describe('MKCOL request handler', () => {
  let sut: MKCOLRequestHandler;

  beforeEach(() => {
    sut = new MKCOLRequestHandler();

    vi.spyOn(AuthService.instance, 'getAuthDetails').mockResolvedValue(UserCredentialsFixture);
  });

  test('when a folder is created, then the server waits for propagation before confirming', async () => {
    const requestedFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/test',
      folderName: 'FolderA',
    });
    const request = createWebDavRequestFixture({
      method: 'MKCOL',
      url: requestedFolderResource.url,
      user: UserSettingsFixture,
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    const parentFolder = newFolderItem({ name: 'test', uuid: 'parent-uuid' });

    vi.spyOn(WebDavUtils, 'getRequestedResource').mockResolvedValue(requestedFolderResource);
    vi.spyOn(WebDavFolderService.instance, 'getDriveFolderItemFromPath').mockResolvedValue(parentFolder);
    vi.spyOn(WebDavUtils, 'getDriveFolderFromResource').mockResolvedValue(undefined);
    vi.spyOn(WebDavFolderService.instance, 'createFolder').mockResolvedValue(
      newFolderItem({ name: 'FolderA', uuid: 'new-folder-uuid' }),
    );

    const startTime = Date.now();
    await sut.handle(request, response);
    const endTime = Date.now();

    expect(response.status).toHaveBeenCalledWith(201);
    expect(endTime - startTime).toBeGreaterThanOrEqual(500);
  });

  test('when a folder creation request succeeds, then the server confirms with a success status', async () => {
    const requestedFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/test',
      folderName: 'FolderA',
    });
    const request = createWebDavRequestFixture({
      method: 'MKCOL',
      url: requestedFolderResource.url,
      user: UserSettingsFixture,
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    const parentFolder = newFolderItem({ name: 'test', uuid: 'parent-uuid' });

    const getRequestedResourceStub = vi
      .spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValue(requestedFolderResource);
    const getDriveFolderItemFromPathStub = vi
      .spyOn(WebDavFolderService.instance, 'getDriveFolderItemFromPath')
      .mockResolvedValue(parentFolder);
    const getDriveFolderFromResourceStub = vi
      .spyOn(WebDavUtils, 'getDriveFolderFromResource')
      .mockResolvedValue(undefined);
    const createFolderStub = vi
      .spyOn(WebDavFolderService.instance, 'createFolder')
      .mockResolvedValue(newFolderItem({ name: 'FolderA', uuid: 'new-folder-uuid' }));

    await sut.handle(request, response);
    expect(response.status).toHaveBeenCalledWith(201);
    expect(getRequestedResourceStub).toHaveBeenCalledWith(request.url);
    expect(getDriveFolderItemFromPathStub).toHaveBeenCalledWith(requestedFolderResource.parentPath);
    expect(getDriveFolderFromResourceStub).toHaveBeenCalledWith(requestedFolderResource.url);
    expect(createFolderStub).toHaveBeenCalledWith({
      folderName: requestedFolderResource.path.base,
      parentFolderUuid: parentFolder.uuid,
    });
  });
});
