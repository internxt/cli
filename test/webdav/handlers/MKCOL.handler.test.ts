import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MKCOLRequestHandler } from '../../../src/webdav/handlers/MKCOL.handler';
import { DriveFolderService } from '../../../src/services/drive/drive-folder.service';
import {
  createWebDavRequestFixture,
  createWebDavResponseFixture,
  getRequestedFolderResource,
} from '../../fixtures/webdav.fixture';
import { UserSettingsFixture } from '../../fixtures/auth.fixture';
import { CreateFolderResponse } from '@internxt/sdk/dist/drive/storage/types';
import { newCreateFolderResponse, newFolderItem } from '../../fixtures/drive.fixture';
import { WebDavRequestedResource } from '../../../src/types/webdav.types';
import { WebDavUtils } from '../../../src/utils/webdav.utils';
import { NotFoundError } from '../../../src/utils/errors.utils';

describe('MKCOL request handler', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When a WebDav client sends a MKCOL request, it should reply with a 201 if success', async () => {
    const driveFolderService = DriveFolderService.instance;
    const requestHandler = new MKCOLRequestHandler({
      driveFolderService,
    });
    const requestedFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/test',
      folderName: 'FolderA',
    });
    const requestedParentFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/',
      folderName: 'test',
    });

    const request = createWebDavRequestFixture({
      method: 'MKCOL',
      url: requestedFolderResource.url,
      user: UserSettingsFixture,
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    const parentFolder = newFolderItem();
    const newFolderResponse: CreateFolderResponse = newCreateFolderResponse({
      plainName: 'FolderA',
      parentId: parentFolder.id,
      parentUuid: parentFolder.uuid,
    });

    const getRequestedResourceStub = vi
      .spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValueOnce(requestedFolderResource)
      .mockResolvedValueOnce(requestedParentFolderResource);
    const getAndSearchItemFromResourceStub = vi
      .spyOn(WebDavUtils, 'getAndSearchItemFromResource')
      .mockResolvedValue(parentFolder);
    const createFolderStub = vi
      .spyOn(driveFolderService, 'createFolder')
      .mockReturnValue([Promise.resolve(newFolderResponse), { cancel: () => {} }]);
    const getFolderBeforeItsCreation = vi
      .spyOn(driveFolderService, 'getFolderMetadataByPath')
      .mockRejectedValue(new NotFoundError('Folder not exists'));

    await requestHandler.handle(request, response);
    expect(response.status).toHaveBeenCalledWith(201);
    expect(getRequestedResourceStub).toHaveBeenCalledTimes(2);
    expect(getAndSearchItemFromResourceStub).toHaveBeenCalledOnce();
    expect(createFolderStub).toHaveBeenCalledWith({
      plainName: requestedFolderResource.name,
      parentFolderUuid: parentFolder.uuid,
    });
    expect(getFolderBeforeItsCreation).toHaveBeenCalledOnce();
  });
});
