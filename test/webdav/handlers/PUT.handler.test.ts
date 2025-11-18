import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createWebDavRequestFixture,
  createWebDavResponseFixture,
  getRequestedFileResource,
  getRequestedFolderResource,
} from '../../fixtures/webdav.fixture';
import { DriveFileService } from '../../../src/services/drive/drive-file.service';
import { DriveFolderService } from '../../../src/services/drive/drive-folder.service';
import { CryptoService } from '../../../src/services/crypto.service';
import { DownloadService } from '../../../src/services/network/download.service';
import { AuthService } from '../../../src/services/auth.service';
import { UnsupportedMediaTypeError } from '../../../src/utils/errors.utils';
import { SdkManager } from '../../../src/services/sdk-manager.service';
import { NetworkFacade } from '../../../src/services/network/network-facade.service';
import { PUTRequestHandler } from '../../../src/webdav/handlers/PUT.handler';
import { fail } from 'node:assert';
import { WebDavFolderService } from '../../../src/webdav/services/webdav-folder.service';
import { TrashService } from '../../../src/services/drive/trash.service';
import { WebDavRequestedResource } from '../../../src/types/webdav.types';
import { WebDavUtils } from '../../../src/utils/webdav.utils';
import { newDriveFile, newFolderItem } from '../../fixtures/drive.fixture';
import { UserCredentialsFixture } from '../../fixtures/login.fixture';
import { Environment } from '@internxt/inxt-js';
import { ConfigService } from '../../../src/services/config.service';
import { UserFixture } from '../../fixtures/auth.fixture';

describe('PUT request handler', () => {
  let networkFacade: NetworkFacade;
  let sut: PUTRequestHandler;
  const getNetworkMock = () => {
    return SdkManager.instance.getNetwork({
      user: 'user',
      pass: 'pass',
    });
  };

  const getEnvironmentMock = () => {
    return new Environment({
      bridgeUser: 'user',
      bridgePass: 'pass',
      bridgeUrl: ConfigService.instance.get('NETWORK_URL'),
      encryptionKey: UserFixture.mnemonic,
      appDetails: SdkManager.getAppDetails(),
    });
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    networkFacade = new NetworkFacade(
      getNetworkMock(),
      getEnvironmentMock(),
      DownloadService.instance,
      CryptoService.instance,
    );
    const webDavFolderService = new WebDavFolderService({
      driveFolderService: DriveFolderService.instance,
      configService: ConfigService.instance,
    });
    sut = new PUTRequestHandler({
      driveFileService: DriveFileService.instance,
      driveFolderService: DriveFolderService.instance,
      webDavFolderService,
      authService: AuthService.instance,
      trashService: TrashService.instance,
      networkFacade,
    });
  });

  it('When the content-length request is 0, then it should throw an UnsupportedMediaTypeError', async () => {
    const request = createWebDavRequestFixture({
      method: 'PUT',
      url: '/file.txt',
      headers: {
        'content-length': '0',
      },
    });

    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    try {
      await sut.handle(request, response);
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect(error).to.be.instanceOf(UnsupportedMediaTypeError);
    }
  });

  it('When the Drive destination folder is found, then it should upload the file to the folder', async () => {
    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();
    const requestedParentFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/',
      folderName: '',
    });
    const folderFixture = newFolderItem({ name: requestedParentFolderResource.name });
    const fileFixture = newDriveFile({ folderId: folderFixture.id, folderUuid: folderFixture.uuid });

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
    const uploadStub = vi.spyOn(networkFacade, 'uploadFile').mockImplementation(
      // @ts-expect-error - We only mock the properties we need
      (_, __, ___, callback: (err: Error | null, res: string | null) => void) => {
        return callback(null, 'uploaded-file-id');
      },
    );
    const createDriveFileStub = vi
      .spyOn(DriveFileService.instance, 'createFile')
      .mockResolvedValue(fileFixture.toItem());

    await sut.handle(request, response);
    expect(response.status).toHaveBeenCalledWith(201);
    expect(getRequestedResourceStub).toHaveBeenCalledTimes(2);
    expect(getAndSearchItemFromResourceStub).toHaveBeenCalledOnce();
    expect(getDriveFolderFromResourceStub).toHaveBeenCalledOnce();
    expect(getAuthDetailsStub).toHaveBeenCalledOnce();
    expect(uploadStub).toHaveBeenCalledOnce();
    expect(createDriveFileStub).toHaveBeenCalledOnce();
  });

  it('When the file already exists, then it should upload and replace the file to the folder', async () => {
    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();
    const requestedParentFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/',
      folderName: '',
    });
    const folderFixture = newFolderItem({ name: requestedParentFolderResource.name });
    const fileFixture = newDriveFile({ folderId: folderFixture.id, folderUuid: folderFixture.uuid });

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
      .mockResolvedValueOnce(fileFixture.toItem());
    const getDriveFolderFromResourceStub = vi
      .spyOn(WebDavUtils, 'getDriveFolderFromResource')
      .mockResolvedValue(folderFixture);
    const deleteDriveFileStub = vi.spyOn(TrashService.instance, 'trashItems').mockResolvedValue();
    const getAuthDetailsStub = vi
      .spyOn(AuthService.instance, 'getAuthDetails')
      .mockResolvedValue(UserCredentialsFixture);
    const uploadStub = vi.spyOn(networkFacade, 'uploadFile').mockImplementation(
      // @ts-expect-error - We only mock the properties we need
      (_, __, ___, callback: (err: Error | null, res: string | null) => void) => {
        return callback(null, 'uploaded-file-id');
      },
    );
    const createDriveFileStub = vi
      .spyOn(DriveFileService.instance, 'createFile')
      .mockResolvedValue(fileFixture.toItem());

    await sut.handle(request, response);
    expect(response.status).toHaveBeenCalledWith(201);
    expect(getRequestedResourceStub).toHaveBeenCalledTimes(2);
    expect(getAndSearchItemFromResourceStub).toHaveBeenCalledOnce();
    expect(getDriveFolderFromResourceStub).toHaveBeenCalledOnce();
    expect(getAuthDetailsStub).toHaveBeenCalledOnce();
    expect(uploadStub).toHaveBeenCalledOnce();
    expect(createDriveFileStub).toHaveBeenCalledOnce();
    expect(deleteDriveFileStub).toHaveBeenCalledOnce();
  });

  it('When file is uploaded, then it should wait 500ms for backend propagation before returning 201', async () => {
    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();
    const requestedParentFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/',
      folderName: '',
    });
    const folderFixture = newFolderItem({ name: requestedParentFolderResource.name });
    const fileFixture = newDriveFile({ folderId: folderFixture.id, folderUuid: folderFixture.uuid });

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

    vi.spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValueOnce(requestedFileResource)
      .mockResolvedValueOnce(requestedParentFolderResource);
    vi.spyOn(WebDavUtils, 'getDriveItemFromResource').mockResolvedValue(undefined);
    vi.spyOn(WebDavUtils, 'getDriveFolderFromResource').mockResolvedValue(folderFixture);
    vi.spyOn(AuthService.instance, 'getAuthDetails').mockResolvedValue(UserCredentialsFixture);
    vi.spyOn(networkFacade, 'uploadFile').mockImplementation(
      // @ts-expect-error - We only mock the properties we need
      (_, __, ___, callback: (err: Error | null, res: string | null) => void) => {
        return callback(null, 'uploaded-file-id');
      },
    );
    vi.spyOn(DriveFileService.instance, 'createFile').mockResolvedValue(fileFixture.toItem());

    const startTime = Date.now();
    await sut.handle(request, response);
    const endTime = Date.now();

    expect(response.status).toHaveBeenCalledWith(201);
    expect(endTime - startTime).toBeGreaterThanOrEqual(500);
  });
});
