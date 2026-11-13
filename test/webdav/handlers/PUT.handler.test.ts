import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  createWebDavRequestFixture,
  createWebDavResponseFixture,
  getNetworkFacadeMock,
  getNetworkOptionsMock,
  getRequestedFileResource,
  getRequestedFolderResource,
} from '../../fixtures/webdav.fixture';
import { DriveFileService } from '../../../src/services/drive/drive-file.service';
import { DriveItemService } from '../../../src/services/drive/drive-item.service';
import { AuthService } from '../../../src/services/auth.service';
import { NetworkFacade } from '../../../src/services/network/network-facade.service';
import { PUTRequestHandler } from '../../../src/webdav/handlers/PUT.handler';
import { WebDavRequestedResource } from '../../../src/types/webdav.types';
import { WebDavUtils } from '../../../src/utils/webdav.utils';
import { newFileItem, newFolderItem } from '../../fixtures/drive.fixture';
import { UserCredentialsFixture } from '../../fixtures/login.fixture';
import { FileStatus } from '@internxt/sdk/dist/drive/storage/types';
import { CLIUtils } from '../../../src/utils/cli.utils';
import { UsageService } from '../../../src/services/usage.service';

describe('PUT request handler', () => {
  let networkFacade: NetworkFacade;
  let sut: PUTRequestHandler;

  beforeEach(() => {
    networkFacade = getNetworkFacadeMock();
    vi.spyOn(CLIUtils, 'prepareNetwork').mockResolvedValue(getNetworkOptionsMock({ networkFacade }));
    vi.spyOn(UsageService.instance, 'fetchLimits').mockResolvedValue({
      maxUploadFileSize: null,
      versioning: { enabled: false, maxFileSize: 0, retentionDays: 0, maxVersions: 0 },
      photosAccess: false,
    });

    sut = new PUTRequestHandler();
  });

  test('when an empty file is uploaded, then the server creates it without uploading content', async () => {
    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();
    const requestedParentFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/',
      folderName: '',
    });
    const folderFixture = newFolderItem({ name: requestedParentFolderResource.name });
    const fileFixture = newFileItem({
      folderUuid: folderFixture.uuid,
      size: 0,
      fileId: undefined,
    });

    const request = createWebDavRequestFixture({
      method: 'PUT',
      url: requestedFileResource.url,
      headers: {
        'content-length': '0',
      },
    });

    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    const getRequestedResourceStub = vi
      .spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValueOnce(requestedFileResource)
      .mockResolvedValueOnce(requestedParentFolderResource);
    const getAndSearchItemFromResourceStub = vi
      .spyOn(WebDavUtils, 'getDriveItemFromResource')
      .mockResolvedValue(undefined);
    const getDriveFolderFromResourceStub = vi
      .spyOn(WebDavUtils, 'getDriveFolderFromResource')
      .mockResolvedValue(folderFixture);
    const getAuthDetailsStub = vi
      .spyOn(AuthService.instance, 'getAuthDetails')
      .mockResolvedValue(UserCredentialsFixture);
    const uploadStub = vi.spyOn(networkFacade, 'uploadFile');
    const createDriveFileStub = vi.spyOn(DriveFileService.instance, 'createFile').mockResolvedValue(fileFixture);

    await sut.handle(request, response);
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.header).toHaveBeenCalledWith('ETag', WebDavUtils.getItemETag(fileFixture));
    expect(getRequestedResourceStub).toHaveBeenCalledTimes(2);
    expect(getAndSearchItemFromResourceStub).toHaveBeenCalledOnce();
    expect(getDriveFolderFromResourceStub).toHaveBeenCalledOnce();
    expect(getAuthDetailsStub).toHaveBeenCalledOnce();
    expect(uploadStub).not.toHaveBeenCalled();
    expect(createDriveFileStub).toHaveBeenCalledOnce();
    expect(createDriveFileStub).toHaveBeenCalledWith(
      expect.objectContaining({
        fileId: undefined,
        size: 0,
        folderUuid: folderFixture.uuid,
        plainName: requestedFileResource.path.name,
      }),
    );
  });

  test('when a file is uploaded to an existing folder, then the server stores it', async () => {
    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();
    const requestedParentFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/',
      folderName: '',
    });
    const folderFixture = newFolderItem({ name: requestedParentFolderResource.name });
    const fileFixture = newFileItem({ folderUuid: folderFixture.uuid });

    const request = createWebDavRequestFixture({
      method: 'PUT',
      url: requestedFileResource.url,
      headers: {
        'content-length': '100',
      },
    });

    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    const getRequestedResourceStub = vi
      .spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValueOnce(requestedFileResource)
      .mockResolvedValueOnce(requestedParentFolderResource);
    const getAndSearchItemFromResourceStub = vi
      .spyOn(WebDavUtils, 'getDriveItemFromResource')
      .mockResolvedValue(undefined);
    const getDriveFolderFromResourceStub = vi
      .spyOn(WebDavUtils, 'getDriveFolderFromResource')
      .mockResolvedValue(folderFixture);
    const getAuthDetailsStub = vi
      .spyOn(AuthService.instance, 'getAuthDetails')
      .mockResolvedValue(UserCredentialsFixture);
    const uploadStub = vi.spyOn(networkFacade, 'uploadFile').mockResolvedValue('uploaded-file-id');
    const createDriveFileStub = vi.spyOn(DriveFileService.instance, 'createFile').mockResolvedValue(fileFixture);

    await sut.handle(request, response);
    expect(response.status).toHaveBeenCalledWith(201);
    expect(response.header).toHaveBeenCalledWith('ETag', WebDavUtils.getItemETag(fileFixture));
    expect(getRequestedResourceStub).toHaveBeenCalledTimes(2);
    expect(getAndSearchItemFromResourceStub).toHaveBeenCalledOnce();
    expect(getDriveFolderFromResourceStub).toHaveBeenCalledOnce();
    expect(getAuthDetailsStub).toHaveBeenCalledOnce();
    expect(uploadStub).toHaveBeenCalledOnce();
    expect(createDriveFileStub).toHaveBeenCalledOnce();
  });

  test('when a file already exists at the destination, then the server replaces it', async () => {
    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();
    const requestedParentFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/',
      folderName: '',
    });
    const folderFixture = newFolderItem({ name: requestedParentFolderResource.name });
    const fileFixture = newFileItem({ folderUuid: folderFixture.uuid });

    const request = createWebDavRequestFixture({
      method: 'PUT',
      url: requestedFileResource.url,
      headers: {
        'content-length': '100',
      },
    });

    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    const getRequestedResourceStub = vi
      .spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValueOnce(requestedFileResource)
      .mockResolvedValueOnce(requestedParentFolderResource);
    const getAndSearchItemFromResourceStub = vi
      .spyOn(WebDavUtils, 'getDriveItemFromResource')
      .mockResolvedValueOnce(fileFixture);
    const getDriveFolderFromResourceStub = vi
      .spyOn(WebDavUtils, 'getDriveFolderFromResource')
      .mockResolvedValue(folderFixture);
    const deleteDriveFileStub = vi.spyOn(WebDavUtils, 'deleteOrTrashItem').mockResolvedValue();
    const getAuthDetailsStub = vi
      .spyOn(AuthService.instance, 'getAuthDetails')
      .mockResolvedValue(UserCredentialsFixture);
    const uploadStub = vi.spyOn(networkFacade, 'uploadFile').mockResolvedValue('uploaded-file-id');
    const createDriveFileStub = vi.spyOn(DriveFileService.instance, 'createFile').mockResolvedValue(fileFixture);
    const replaceDriveFileStub = vi.spyOn(DriveFileService.instance, 'replaceFile').mockResolvedValue(fileFixture);
    const rememberFileWriteStub = vi.spyOn(DriveItemService.instance, 'rememberFileWrite');

    await sut.handle(request, response);
    expect(response.status).toHaveBeenCalledWith(204);
    expect(response.header).toHaveBeenCalledWith('ETag', WebDavUtils.getItemETag(fileFixture));
    expect(getRequestedResourceStub).toHaveBeenCalledTimes(2);
    expect(getAndSearchItemFromResourceStub).toHaveBeenCalledOnce();
    expect(getDriveFolderFromResourceStub).toHaveBeenCalledOnce();
    expect(getAuthDetailsStub).toHaveBeenCalledOnce();
    expect(uploadStub).toHaveBeenCalledOnce();
    expect(replaceDriveFileStub).toHaveBeenCalledWith(
      fileFixture.uuid,
      expect.objectContaining({
        fileId: 'uploaded-file-id',
        folderUuid: folderFixture.uuid,
        plainName: requestedFileResource.path.name,
        size: 100,
      }),
    );
    expect(createDriveFileStub).not.toHaveBeenCalled();
    expect(deleteDriveFileStub).not.toHaveBeenCalled();
    expect(rememberFileWriteStub).toHaveBeenCalledWith(requestedFileResource.url, fileFixture);
  });

  test('when replacing an existing file fails, then the error is returned and the existing file is left untouched', async () => {
    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();
    const requestedParentFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/',
      folderName: '',
    });
    const folderFixture = newFolderItem({ name: requestedParentFolderResource.name });
    const fileFixture = newFileItem({ folderUuid: folderFixture.uuid, size: 0, fileId: undefined });
    const request = createWebDavRequestFixture({
      method: 'PUT',
      url: requestedFileResource.url,
      headers: { 'content-length': '0' },
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });
    const replaceError = new Error('Request failed with status code 500');

    vi.spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValueOnce(requestedFileResource)
      .mockResolvedValueOnce(requestedParentFolderResource);
    vi.spyOn(WebDavUtils, 'getDriveItemFromResource').mockResolvedValueOnce(fileFixture);
    vi.spyOn(WebDavUtils, 'getDriveFolderFromResource').mockResolvedValue(folderFixture);
    vi.spyOn(AuthService.instance, 'getAuthDetails').mockResolvedValue(UserCredentialsFixture);
    const deleteDriveFileStub = vi.spyOn(WebDavUtils, 'deleteOrTrashItem').mockResolvedValue();
    vi.spyOn(DriveFileService.instance, 'replaceFile').mockRejectedValue(replaceError);
    const createDriveFileStub = vi.spyOn(DriveFileService.instance, 'createFile').mockResolvedValue(fileFixture);

    await expect(sut.handle(request, response)).rejects.toBe(replaceError);

    expect(deleteDriveFileStub).not.toHaveBeenCalled();
    expect(createDriveFileStub).not.toHaveBeenCalled();
    expect(response.status).not.toHaveBeenCalled();
  });

  test('when the file found at the destination is trashed, then the server creates a new one', async () => {
    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();
    const requestedParentFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/',
      folderName: '',
    });
    const folderFixture = newFolderItem({ name: requestedParentFolderResource.name });
    const trashedFile = newFileItem({ folderUuid: folderFixture.uuid, size: 0, fileId: undefined, status: FileStatus.TRASHED });
    const createdFile = newFileItem({ folderUuid: folderFixture.uuid, size: 0, fileId: undefined });
    const request = createWebDavRequestFixture({
      method: 'PUT',
      url: requestedFileResource.url,
      headers: { 'content-length': '0' },
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    vi.spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValueOnce(requestedFileResource)
      .mockResolvedValueOnce(requestedParentFolderResource);
    vi.spyOn(WebDavUtils, 'getDriveItemFromResource').mockResolvedValueOnce(trashedFile);
    vi.spyOn(WebDavUtils, 'getDriveFolderFromResource').mockResolvedValue(folderFixture);
    vi.spyOn(AuthService.instance, 'getAuthDetails').mockResolvedValue(UserCredentialsFixture);
    const replaceDriveFileStub = vi.spyOn(DriveFileService.instance, 'replaceFile');
    const createDriveFileStub = vi.spyOn(DriveFileService.instance, 'createFile').mockResolvedValue(createdFile);

    await sut.handle(request, response);

    expect(replaceDriveFileStub).not.toHaveBeenCalled();
    expect(createDriveFileStub).toHaveBeenCalledOnce();
    expect(response.status).toHaveBeenCalledWith(201);
  });
});
