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
  let webDavFolderService: WebDavFolderService;
  let sut: MKCOLRequestHandler;

  beforeEach(() => {
    webDavFolderService = new WebDavFolderService({
      driveFolderService: DriveFolderService.instance,
      configService: ConfigService.instance,
    });
    sut = new MKCOLRequestHandler({
      driveFolderService: DriveFolderService.instance,
      webDavFolderService,
    });
    vi.restoreAllMocks();
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
      .spyOn(webDavFolderService, 'getDriveFolderItemFromPath')
      .mockResolvedValue(parentFolder);
    const getDriveFolderFromResourceStub = vi
      .spyOn(WebDavUtils, 'getDriveFolderFromResource')
      .mockResolvedValue(undefined);
    const createFolderStub = vi
      .spyOn(webDavFolderService, 'createFolder')
      .mockResolvedValue(newFolderItem({ name: 'FolderA', uuid: 'new-folder-uuid' }));

    await sut.handle(request, response);
    expect(response.status).toHaveBeenCalledWith(201);
    expect(getRequestedResourceStub).toHaveBeenCalledWith(request.url);
    expect(getDriveFolderItemFromPathStub).toHaveBeenCalledWith(requestedFolderResource.parentPath);
    expect(getDriveFolderFromResourceStub).toHaveBeenCalledWith({
      url: requestedFolderResource.url,
      driveFolderService: DriveFolderService.instance,
    });
    expect(createFolderStub).toHaveBeenCalledWith({
      folderName: requestedFolderResource.path.base,
      parentFolderUuid: parentFolder.uuid,
    });
  });
});
