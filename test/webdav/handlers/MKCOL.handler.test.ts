import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MKCOLRequestHandler } from '../../../src/webdav/handlers/MKCOL.handler';
import { DriveFolderService } from '../../../src/services/drive/drive-folder.service';
import {
  createWebDavRequestFixture,
  createWebDavResponseFixture,
  getRequestedFolderResource,
} from '../../fixtures/webdav.fixture';
import { UserSettingsFixture } from '../../fixtures/auth.fixture';
import { newFolderItem } from '../../fixtures/drive.fixture';
import { WebDavRequestedResource } from '../../../src/types/webdav.types';
import { WebDavUtils } from '../../../src/utils/webdav.utils';
import { WebDavFolderService } from '../../../src/webdav/services/webdav-folder.service';
import { ConfigService } from '../../../src/services/config.service';

describe('MKCOL request handler', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When a WebDav client sends a MKCOL request, it should reply with a 201 if success', async () => {
    const driveFolderService = DriveFolderService.instance;
    const webDavFolderService = new WebDavFolderService({
      driveFolderService: DriveFolderService.instance,
      configService: ConfigService.instance,
    });
    const requestHandler = new MKCOLRequestHandler({
      driveFolderService,
      webDavFolderService,
    });
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
      .spyOn(webDavFolderService, 'getDriveFolderItemFromPath')
      .mockResolvedValue(parentFolder);
    const getAndSearchItemFromResourceStub = vi
      .spyOn(WebDavUtils, 'getDriveItemFromResource')
      .mockResolvedValue(undefined);
    const createFolderStub = vi
      .spyOn(webDavFolderService, 'createFolder')
      .mockResolvedValue(newFolderItem({ name: 'FolderA', uuid: 'new-folder-uuid' }));

    await requestHandler.handle(request, response);
    expect(response.status).toHaveBeenCalledWith(201);
    expect(getRequestedResourceStub).toHaveBeenCalledWith(request);
    expect(getDriveFolderItemFromPathStub).toHaveBeenCalledWith(requestedFolderResource.parentPath);
    expect(getAndSearchItemFromResourceStub).toHaveBeenCalledWith({
      resource: requestedFolderResource,
      driveFolderService,
    });
    expect(createFolderStub).toHaveBeenCalledWith({
      folderName: requestedFolderResource.path.base,
      parentFolderUuid: parentFolder.uuid,
    });
  });
});
