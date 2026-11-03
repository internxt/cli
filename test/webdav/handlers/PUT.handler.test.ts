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
import { CLIUtils } from '../../../src/utils/cli.utils';
import { UsageService } from '../../../src/services/usage.service';
import { webdavLogger } from '../../../src/utils/logger.utils';
import { AxiosResponseError } from '@internxt/sdk/dist/shared/types/errors';
import { AsyncUtils } from '../../../src/utils/async.utils';

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

  test('when replacing an existing file fails, then the request id is logged and the file is deleted and created', async () => {
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
      headers: {
        'content-length': '0',
      },
    });

    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    const replaceError = new AxiosResponseError('Request failed with status code 500', 'PUT /files/uuid', {
      status: 500,
      data: {},
      headers: { 'x-request-id': 'req-123' },
      statusText: 'Internal Server Error',
      // @ts-expect-error partial AxiosResponse fixture, only the fields read by AxiosResponseError are needed
      config: {},
    });

    vi.spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValueOnce(requestedFileResource)
      .mockResolvedValueOnce(requestedParentFolderResource);
    vi.spyOn(WebDavUtils, 'getDriveItemFromResource').mockResolvedValueOnce(fileFixture);
    vi.spyOn(WebDavUtils, 'getDriveFolderFromResource').mockResolvedValue(folderFixture);
    vi.spyOn(AuthService.instance, 'getAuthDetails').mockResolvedValue(UserCredentialsFixture);
    const deleteDriveFileStub = vi.spyOn(WebDavUtils, 'deleteOrTrashItem').mockResolvedValue();
    const replaceDriveFileStub = vi.spyOn(DriveFileService.instance, 'replaceFile').mockRejectedValue(replaceError);
    const createDriveFileStub = vi.spyOn(DriveFileService.instance, 'createFile').mockResolvedValue(fileFixture);

    await sut.handle(request, response);

    expect(response.status).toHaveBeenCalledWith(204);
    expect(replaceDriveFileStub).toHaveBeenCalledOnce();
    expect(webdavLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Request failed with status code 500 (requestId: req-123)'),
    );
    expect(deleteDriveFileStub).toHaveBeenCalledWith(fileFixture);
    expect(createDriveFileStub).toHaveBeenCalledOnce();
  });
  describe('when replacing fails and the trashed file still conflicts with the new one', () => {
    const conflictError = new AxiosResponseError('Request failed with status code 409', 'POST /files', {
      status: 409,
      data: { message: 'File already exists' },
      headers: {},
      statusText: 'Conflict',
      // @ts-expect-error partial AxiosResponse fixture, only the fields read by AxiosResponseError are needed
      config: {},
    });

    const setupReplaceFallback = () => {
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

      vi.spyOn(WebDavUtils, 'getRequestedResource')
        .mockResolvedValueOnce(requestedFileResource)
        .mockResolvedValueOnce(requestedParentFolderResource);
      vi.spyOn(WebDavUtils, 'getDriveItemFromResource').mockResolvedValueOnce(fileFixture);
      vi.spyOn(WebDavUtils, 'getDriveFolderFromResource').mockResolvedValue(folderFixture);
      vi.spyOn(AuthService.instance, 'getAuthDetails').mockResolvedValue(UserCredentialsFixture);
      vi.spyOn(WebDavUtils, 'deleteOrTrashItem').mockResolvedValue();
      vi.spyOn(DriveFileService.instance, 'replaceFile').mockRejectedValue(
        new Error('Request failed with status code 500'),
      );
      vi.spyOn(AsyncUtils, 'sleep').mockResolvedValue();

      return { request, response, fileFixture };
    };

    test('when the conflict clears on a retry, then the file is created', async () => {
      const { request, response, fileFixture } = setupReplaceFallback();
      const createDriveFileStub = vi
        .spyOn(DriveFileService.instance, 'createFile')
        .mockRejectedValueOnce(conflictError)
        .mockResolvedValueOnce(fileFixture);

      await sut.handle(request, response);

      expect(response.status).toHaveBeenCalledWith(204);
      expect(createDriveFileStub).toHaveBeenCalledTimes(2);
    });

    test('when the conflict never clears, then the conflict is returned', async () => {
      const { request, response } = setupReplaceFallback();
      const createDriveFileStub = vi.spyOn(DriveFileService.instance, 'createFile').mockRejectedValue(conflictError);

      await expect(sut.handle(request, response)).rejects.toBe(conflictError);

      expect(createDriveFileStub).toHaveBeenCalledTimes(3);
    });
  });

  describe('when the file was not found at the path but creating it conflicts', () => {
    const conflictError = new AxiosResponseError('Request failed with status code 409', 'POST /files', {
      status: 409,
      data: { message: 'File already exists' },
      headers: {},
      statusText: 'Conflict',
      // @ts-expect-error partial AxiosResponse fixture, only the fields read by AxiosResponseError are needed
      config: {},
    });

    const setupConflictingUpload = () => {
      const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();
      const requestedParentFolderResource: WebDavRequestedResource = getRequestedFolderResource({
        parentFolder: '/',
        folderName: '',
      });
      const folderFixture = newFolderItem({ name: requestedParentFolderResource.name });
      const existingFileFixture = newFileItem({ folderUuid: folderFixture.uuid });

      const request = createWebDavRequestFixture({
        method: 'PUT',
        url: requestedFileResource.url,
        headers: { 'content-length': '100' },
      });
      const response = createWebDavResponseFixture({
        status: vi.fn().mockReturnValue({ send: vi.fn() }),
      });

      vi.spyOn(WebDavUtils, 'getRequestedResource')
        .mockResolvedValueOnce(requestedFileResource)
        .mockResolvedValueOnce(requestedParentFolderResource);
      vi.spyOn(WebDavUtils, 'getDriveItemFromResource').mockResolvedValue(undefined);
      vi.spyOn(WebDavUtils, 'getDriveFolderFromResource').mockResolvedValue(folderFixture);
      vi.spyOn(AuthService.instance, 'getAuthDetails').mockResolvedValue(UserCredentialsFixture);
      vi.spyOn(networkFacade, 'uploadFile').mockResolvedValue('uploaded-file-id');
      vi.spyOn(AsyncUtils, 'sleep').mockResolvedValue();

      return { request, response, requestedFileResource, folderFixture, existingFileFixture };
    };

    test('when the existing file is found, then the server replaces it', async () => {
      const { request, response, requestedFileResource, folderFixture, existingFileFixture } = setupConflictingUpload();
      const createDriveFileStub = vi.spyOn(DriveFileService.instance, 'createFile').mockRejectedValue(conflictError);
      const findExistentFileStub = vi
        .spyOn(DriveFileService.instance, 'findExistentFile')
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(existingFileFixture);
      const replaceDriveFileStub = vi
        .spyOn(DriveFileService.instance, 'replaceFile')
        .mockResolvedValue(existingFileFixture);

      await sut.handle(request, response);

      expect(response.status).toHaveBeenCalledWith(204);
      expect(createDriveFileStub).toHaveBeenCalledOnce();
      expect(findExistentFileStub).toHaveBeenCalledTimes(2);
      expect(findExistentFileStub).toHaveBeenCalledWith(folderFixture.uuid, {
        plainName: requestedFileResource.path.name,
        type: requestedFileResource.path.ext.replace('.', ''),
      });
      expect(replaceDriveFileStub).toHaveBeenCalledWith(
        existingFileFixture.uuid,
        expect.objectContaining({ fileId: 'uploaded-file-id', size: 100 }),
      );
    });

    test('when the existing file never shows up, then the conflict is returned', async () => {
      const { request, response } = setupConflictingUpload();
      vi.spyOn(DriveFileService.instance, 'createFile').mockRejectedValue(conflictError);
      const findExistentFileStub = vi.spyOn(DriveFileService.instance, 'findExistentFile').mockResolvedValue(undefined);
      const replaceDriveFileStub = vi.spyOn(DriveFileService.instance, 'replaceFile');

      await expect(sut.handle(request, response)).rejects.toBe(conflictError);

      expect(findExistentFileStub).toHaveBeenCalledTimes(3);
      expect(replaceDriveFileStub).not.toHaveBeenCalled();
    });

    test('when the only file found was deleted moments ago, then the conflict is returned', async () => {
      const { request, response, existingFileFixture } = setupConflictingUpload();
      DriveItemService.instance.rememberDeletion(existingFileFixture.uuid);
      vi.spyOn(DriveFileService.instance, 'createFile').mockRejectedValue(conflictError);
      vi.spyOn(DriveFileService.instance, 'findExistentFile').mockResolvedValue(existingFileFixture);
      const replaceDriveFileStub = vi.spyOn(DriveFileService.instance, 'replaceFile');

      await expect(sut.handle(request, response)).rejects.toBe(conflictError);

      expect(replaceDriveFileStub).not.toHaveBeenCalled();
    });

    test('when creating the file fails for another reason, then no existing file is looked up', async () => {
      const { request, response } = setupConflictingUpload();
      const serverError = new Error('Request failed with status code 500');
      vi.spyOn(DriveFileService.instance, 'createFile').mockRejectedValue(serverError);
      const findExistentFileStub = vi.spyOn(DriveFileService.instance, 'findExistentFile');

      await expect(sut.handle(request, response)).rejects.toBe(serverError);

      expect(findExistentFileStub).not.toHaveBeenCalled();
    });
  });
});
