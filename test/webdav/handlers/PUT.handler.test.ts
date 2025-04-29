import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createWebDavRequestFixture,
  createWebDavResponseFixture,
  getRequestedFileResource,
  getRequestedFolderResource,
} from '../../fixtures/webdav.fixture';
import { DriveFileService } from '../../../src/services/drive/drive-file.service';
import { CryptoService } from '../../../src/services/crypto.service';
import { DownloadService } from '../../../src/services/network/download.service';
import { AuthService } from '../../../src/services/auth.service';
import { UnsupportedMediaTypeError } from '../../../src/utils/errors.utils';
import { SdkManager } from '../../../src/services/sdk-manager.service';
import { NetworkFacade } from '../../../src/services/network/network-facade.service';
import { PUTRequestHandler } from '../../../src/webdav/handlers/PUT.handler';
import { fail } from 'node:assert';
import { DriveFolderService } from '../../../src/services/drive/drive-folder.service';
import { TrashService } from '../../../src/services/drive/trash.service';
import { WebDavRequestedResource } from '../../../src/types/webdav.types';
import { WebDavUtils } from '../../../src/utils/webdav.utils';
import { newDriveFile, newFolderItem } from '../../fixtures/drive.fixture';
import { UserCredentialsFixture } from '../../fixtures/login.fixture';
import { Environment } from '@internxt/inxt-js';
import { ConfigService } from '../../../src/services/config.service';
import { UserFixture } from '../../fixtures/auth.fixture';

describe('PUT request handler', () => {
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
    });
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When the content-length request is 0, then it should throw an UnsupportedMediaTypeError', async () => {
    const networkFacade = new NetworkFacade(
      getNetworkMock(),
      getEnvironmentMock(),
      DownloadService.instance,
      CryptoService.instance,
    );
    const sut = new PUTRequestHandler({
      driveFileService: DriveFileService.instance,
      driveFolderService: DriveFolderService.instance,
      authService: AuthService.instance,
      trashService: TrashService.instance,
      networkFacade,
    });

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
    const downloadService = DownloadService.instance;
    const cryptoService = CryptoService.instance;
    const authService = AuthService.instance;
    const networkFacade = new NetworkFacade(getNetworkMock(), getEnvironmentMock(), downloadService, cryptoService);
    const sut = new PUTRequestHandler({
      driveFileService: DriveFileService.instance,
      driveFolderService: DriveFolderService.instance,
      authService: AuthService.instance,
      trashService: TrashService.instance,
      networkFacade,
    });

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
      .spyOn(WebDavUtils, 'getAndSearchItemFromResource')
      .mockResolvedValueOnce(folderFixture)
      .mockRejectedValue(new Error());
    const getAuthDetailsStub = vi.spyOn(authService, 'getAuthDetails').mockResolvedValue(UserCredentialsFixture);
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
    expect(response.status).toHaveBeenCalledWith(200);
    expect(getRequestedResourceStub).toHaveBeenCalledTimes(2);
    expect(getAndSearchItemFromResourceStub).toHaveBeenCalledTimes(2);
    expect(getAuthDetailsStub).toHaveBeenCalledOnce();
    expect(uploadStub).toHaveBeenCalledOnce();
    expect(createDriveFileStub).toHaveBeenCalledOnce();
  });

  it('When the file already exists, then it should upload and replace the file to the folder', async () => {
    const downloadService = DownloadService.instance;
    const cryptoService = CryptoService.instance;
    const authService = AuthService.instance;
    const trashService = TrashService.instance;
    const networkFacade = new NetworkFacade(getNetworkMock(), getEnvironmentMock(), downloadService, cryptoService);
    const sut = new PUTRequestHandler({
      driveFileService: DriveFileService.instance,
      driveFolderService: DriveFolderService.instance,
      authService: AuthService.instance,
      trashService: TrashService.instance,
      networkFacade,
    });

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
      .spyOn(WebDavUtils, 'getAndSearchItemFromResource')
      .mockResolvedValueOnce(folderFixture)
      .mockResolvedValueOnce(fileFixture.toItem());
    const deleteDriveFileStub = vi.spyOn(trashService, 'trashItems').mockResolvedValue();
    const getAuthDetailsStub = vi.spyOn(authService, 'getAuthDetails').mockResolvedValue(UserCredentialsFixture);
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
    expect(response.status).toHaveBeenCalledWith(200);
    expect(getRequestedResourceStub).toHaveBeenCalledTimes(2);
    expect(getAndSearchItemFromResourceStub).toHaveBeenCalledTimes(2);
    expect(getAuthDetailsStub).toHaveBeenCalledOnce();
    expect(uploadStub).toHaveBeenCalledOnce();
    expect(createDriveFileStub).toHaveBeenCalledOnce();
    expect(deleteDriveFileStub).toHaveBeenCalledOnce();
  });
});
