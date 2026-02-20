import { beforeEach, describe, expect, it, vi } from 'vitest';
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
import { WebDavFolderService } from '../../../src/webdav/services/webdav-folder.service';

describe('MKCOL request handler', () => {
  let sut: MKCOLRequestHandler;

  beforeEach(() => {
    vi.restoreAllMocks();
    sut = new MKCOLRequestHandler();

    vi.spyOn(AuthService.instance, 'getAuthDetails').mockResolvedValue(UserCredentialsFixture);
  });

  it('When a WebDav client sends a MKCOL request, it should reply with a 201 if success', async () => {
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
