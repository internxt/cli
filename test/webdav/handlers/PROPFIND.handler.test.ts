import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PROPFINDRequestHandler } from '../../../src/webdav/handlers/PROPFIND.handler';
import { DriveFolderService } from '../../../src/services/drive/drive-folder.service';
import { UserSettingsFixture } from '../../fixtures/auth.fixture';
import { newFileItem, newFolderItem, newPaginatedFolder } from '../../fixtures/drive.fixture';
import {
  createWebDavRequestFixture,
  createWebDavResponseFixture,
  getRequestedFileResource,
  getRequestedFolderResource,
} from '../../fixtures/webdav.fixture';
import { FormatUtils } from '../../../src/utils/format.utils';
import { WebDavRequestedResource } from '../../../src/types/webdav.types';
import { WebDavUtils } from '../../../src/utils/webdav.utils';
import mime from 'mime-types';
import crypto, { randomUUID } from 'node:crypto';
import { UsageService } from '../../../src/services/usage.service';
import { XMLUtils } from '../../../src/utils/xml.utils';

vi.mock('node:crypto', async () => {
  const actual = await vi.importActual<typeof import('node:crypto')>('node:crypto');
  return {
    ...(actual as object),
    randomUUID: vi.fn().mockImplementation(actual.randomUUID),
  };
});

const randomUUIDStub = vi.mocked(randomUUID);

describe('PROPFIND request handler', () => {
  let sut: PROPFINDRequestHandler;

  beforeEach(() => {
    sut = new PROPFINDRequestHandler();
    vi.restoreAllMocks();
  });

  it('When the root folder exists and there is no content, then it should return the correct XML', async () => {
    const requestedFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/',
      folderName: '',
    });

    const request = createWebDavRequestFixture({
      method: 'PROPFIND',
      url: '/',
      user: UserSettingsFixture,
    });

    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    const folderFixture = newFolderItem({
      id: Number.parseInt(UserSettingsFixture.rootFolderId),
    });
    const usageFixture = crypto.randomInt(2000000000);
    const spaceLimitFixture = crypto.randomInt(2000000000);

    const getRequestedResourceStub = vi
      .spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValue(requestedFolderResource);
    const getFolderMetadataStub = vi
      .spyOn(DriveFolderService.instance, 'getFolderMetadataByPath')
      .mockResolvedValue(folderFixture);
    const getFolderContentStub = vi
      .spyOn(DriveFolderService.instance, 'getFolderContent')
      .mockResolvedValue({ folders: [], files: [] });
    const getUsageStub = vi.spyOn(UsageService.instance, 'fetchUsage').mockResolvedValue(usageFixture);
    const spaceLimitStub = vi.spyOn(UsageService.instance, 'fetchSpaceLimit').mockResolvedValue(spaceLimitFixture);

    await sut.handle(request, response);
    expect(response.status).toHaveBeenCalledWith(207);
    expect(response.send).toHaveBeenCalledWith(
      // eslint-disable-next-line max-len
      `<?xml version="1.0" encoding="utf-8" ?><D:multistatus xmlns:D="DAV:"><D:response><D:href>${XMLUtils.encodeWebDavUri('/')}</D:href><D:propstat><D:status>HTTP/1.1 200 OK</D:status><D:prop><D:getcontenttype>application/octet-stream</D:getcontenttype><x1:lastmodified xmlns:x1="SAR:">${FormatUtils.formatDateForWebDav(folderFixture.updatedAt)}</x1:lastmodified><x2:executable xmlns:x2="http://apache.org/dav/props/">F</x2:executable><x3:Win32FileAttributes xmlns:x3="urn:schemas-microsoft-com:">00000030</x3:Win32FileAttributes><D:quota-available-bytes>${spaceLimitFixture - usageFixture}</D:quota-available-bytes><D:quota-used-bytes>${usageFixture}</D:quota-used-bytes><D:resourcetype><D:collection/></D:resourcetype></D:prop></D:propstat></D:response></D:multistatus>`,
    );
    expect(getRequestedResourceStub).toHaveBeenCalledOnce();
    expect(getFolderMetadataStub).toHaveBeenCalledOnce();
    expect(getFolderContentStub).toHaveBeenCalledOnce();
    expect(getUsageStub).toHaveBeenCalledOnce();
    expect(spaceLimitStub).toHaveBeenCalledOnce();
  });

  it('When the root folder exists and there is content, then it should return the correct XML', async () => {
    const requestedFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/',
      folderName: '',
    });

    const request = createWebDavRequestFixture({
      method: 'PROPFIND',
      url: '/',
      user: UserSettingsFixture,
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    const folderFixture = newFolderItem({
      id: Number.parseInt(UserSettingsFixture.rootFolderId),
    });
    const paginatedFolder1 = newPaginatedFolder({
      plainName: 'folder_1',
      updatedAt: new Date('2024-03-04T15:11:01.000Z').toString(),
      uuid: 'FOLDER_UUID_1',
    });
    const usageFixture = crypto.randomInt(2000000000);
    const spaceLimitFixture = crypto.randomInt(2000000000);

    const getRequestedResourceStub = vi
      .spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValue(requestedFolderResource);
    const getAndSearchItemFromResourceStub = vi
      .spyOn(WebDavUtils, 'getDriveItemFromResource')
      .mockResolvedValue(folderFixture);
    const getFolderContentStub = vi.spyOn(DriveFolderService.instance, 'getFolderContent').mockResolvedValue({
      files: [],
      folders: [paginatedFolder1],
    });
    const getUsageStub = vi.spyOn(UsageService.instance, 'fetchUsage').mockResolvedValue(usageFixture);
    const spaceLimitStub = vi.spyOn(UsageService.instance, 'fetchSpaceLimit').mockResolvedValue(spaceLimitFixture);

    await sut.handle(request, response);
    expect(response.status).toHaveBeenCalledWith(207);
    expect(response.send).toHaveBeenCalledWith(
      // eslint-disable-next-line max-len
      `<?xml version="1.0" encoding="utf-8" ?><D:multistatus xmlns:D="DAV:"><D:response><D:href>${XMLUtils.encodeWebDavUri('/')}</D:href><D:propstat><D:status>HTTP/1.1 200 OK</D:status><D:prop><D:getcontenttype>application/octet-stream</D:getcontenttype><x1:lastmodified xmlns:x1="SAR:">${FormatUtils.formatDateForWebDav(folderFixture.updatedAt)}</x1:lastmodified><x2:executable xmlns:x2="http://apache.org/dav/props/">F</x2:executable><x3:Win32FileAttributes xmlns:x3="urn:schemas-microsoft-com:">00000030</x3:Win32FileAttributes><D:quota-available-bytes>${spaceLimitFixture - usageFixture}</D:quota-available-bytes><D:quota-used-bytes>${usageFixture}</D:quota-used-bytes><D:resourcetype><D:collection/></D:resourcetype></D:prop></D:propstat></D:response><D:response><D:href>${XMLUtils.encodeWebDavUri(`/${paginatedFolder1.plainName}/`)}</D:href><D:propstat><D:status>HTTP/1.1 200 OK</D:status><D:prop><D:displayname>${paginatedFolder1.plainName}</D:displayname><D:getlastmodified>${FormatUtils.formatDateForWebDav(paginatedFolder1.updatedAt)}</D:getlastmodified><D:getcontentlength>0</D:getcontentlength><D:resourcetype><D:collection/></D:resourcetype></D:prop></D:propstat></D:response></D:multistatus>`,
    );
    expect(getRequestedResourceStub).toHaveBeenCalledOnce();
    expect(getAndSearchItemFromResourceStub).toHaveBeenCalledOnce();
    expect(getFolderContentStub).toHaveBeenCalledOnce();
    expect(getUsageStub).toHaveBeenCalledOnce();
    expect(spaceLimitStub).toHaveBeenCalledOnce();
  });

  it('When the file exists, then it should return the correct XML', async () => {
    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource({
      parentFolder: '/',
      fileName: 'file',
      fileType: 'png',
    });

    const request = createWebDavRequestFixture({
      method: 'PROPFIND',
      url: '/file.png',
      user: UserSettingsFixture,
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    const fileFixture = newFileItem({ name: 'file', type: 'png' });
    const uuidFixture = 'test-test-test-test-test';
    const etagFixture = uuidFixture.replaceAll('-', '');
    const mimeFixture = 'image/png';

    const getRequestedResourceStub = vi
      .spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValue(requestedFileResource);
    const getAndSearchItemFromResourceStub = vi
      .spyOn(WebDavUtils, 'getDriveItemFromResource')
      .mockResolvedValue(fileFixture);
    randomUUIDStub.mockImplementation(() => 'test-test-test-test-test');
    randomUUIDStub.mockClear();
    const mimeLookupStub = vi.spyOn(mime, 'lookup').mockReturnValue(mimeFixture);

    await sut.handle(request, response);
    expect(response.status).toHaveBeenCalledWith(207);
    expect(response.send).toHaveBeenCalledWith(
      // eslint-disable-next-line max-len
      `<?xml version="1.0" encoding="utf-8" ?><D:multistatus xmlns:D="DAV:"><D:response><D:href>${XMLUtils.encodeWebDavUri(requestedFileResource.url)}</D:href><D:propstat><D:status>HTTP/1.1 200 OK</D:status><D:prop><D:resourcetype></D:resourcetype><D:getetag>&quot;${etagFixture}&quot;</D:getetag><D:displayname>${fileFixture.name + '.' + fileFixture.type}</D:displayname><D:getcontenttype>${mimeFixture}</D:getcontenttype><D:getlastmodified>${FormatUtils.formatDateForWebDav(fileFixture.modificationTime)}</D:getlastmodified><D:getcontentlength>${fileFixture.size}</D:getcontentlength></D:prop></D:propstat></D:response></D:multistatus>`,
    );
    expect(getRequestedResourceStub).toHaveBeenCalledOnce();
    expect(getAndSearchItemFromResourceStub).toHaveBeenCalledOnce();
    expect(randomUUIDStub).toHaveBeenCalledOnce();
    expect(mimeLookupStub).toHaveBeenCalledOnce();
  });

  it('When the folder exists, then it should return the correct XML', async () => {
    const requestedFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/',
      folderName: 'folder_a',
    });

    const request = createWebDavRequestFixture({
      method: 'PROPFIND',
      url: '/folder_a/',
      user: UserSettingsFixture,
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    const folderFixture = newFolderItem({ name: requestedFolderResource.name });
    const paginatedFolder1 = newPaginatedFolder();

    const getRequestedResourceStub = vi
      .spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValue(requestedFolderResource);
    const getAndSearchItemFromResourceStub = vi
      .spyOn(WebDavUtils, 'getDriveItemFromResource')
      .mockResolvedValue(folderFixture);
    const getFolderContentStub = vi.spyOn(DriveFolderService.instance, 'getFolderContent').mockResolvedValue({
      files: [],
      folders: [paginatedFolder1],
    });

    await sut.handle(request, response);
    expect(response.status).toHaveBeenCalledWith(207);
    // TODO: Test the XML response
    expect(getRequestedResourceStub).toHaveBeenCalledOnce();
    expect(getAndSearchItemFromResourceStub).toHaveBeenCalledOnce();
    expect(getFolderContentStub).toHaveBeenCalledOnce();
  });

  it('When the folder does not exists, then it should return a 404 empty response', async () => {
    const requestedFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/',
      folderName: 'folder_a',
    });

    const request = createWebDavRequestFixture({
      method: 'PROPFIND',
      url: '/folder_a/',
      user: UserSettingsFixture,
    });

    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    const getRequestedResourceStub = vi
      .spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValue(requestedFolderResource);
    const getAndSearchItemFromResourceStub = vi
      .spyOn(WebDavUtils, 'getDriveItemFromResource')
      .mockResolvedValue(undefined);

    await sut.handle(request, response);
    expect(response.status).toHaveBeenCalledWith(404);
    expect(response.send).toHaveBeenCalledWith();
    expect(getRequestedResourceStub).toHaveBeenCalledOnce();
    expect(getAndSearchItemFromResourceStub).toHaveBeenCalledOnce();
  });
});
