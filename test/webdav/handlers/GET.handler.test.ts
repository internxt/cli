import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail } from 'node:assert';
import {
  createWebDavRequestFixture,
  createWebDavResponseFixture,
  getRequestedFileResource,
} from '../../fixtures/webdav.fixture';
import { GETRequestHandler } from '../../../src/webdav/handlers/GET.handler';
import { DriveFileService } from '../../../src/services/drive/drive-file.service';
import { getDriveDatabaseManager } from '../../fixtures/drive-database.fixture';
import { CryptoService } from '../../../src/services/crypto.service';
import { DownloadService } from '../../../src/services/network/download.service';
import { UploadService } from '../../../src/services/network/upload.service';
import { AuthService } from '../../../src/services/auth.service';
import { NotFoundError } from '../../../src/utils/errors.utils';
import { SdkManager } from '../../../src/services/sdk-manager.service';
import { NetworkFacade } from '../../../src/services/network/network-facade.service';
import { WebDavUtils } from '../../../src/utils/webdav.utils';
import { WebDavRequestedResource } from '../../../src/types/webdav.types';
import { newFileItem } from '../../fixtures/drive.fixture';
import { LoginCredentials } from '../../../src/types/command.types';
import { UserCredentialsFixture } from '../../fixtures/login.fixture';
import { randomInt } from 'node:crypto';
import { NetworkUtils } from '../../../src/utils/network.utils';

describe('GET request handler', () => {
  const getNetworkMock = () => {
    return SdkManager.instance.getNetwork({
      user: 'user',
      pass: 'pass',
    });
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When the Drive file is not found, then it should throw a NotFoundError', async () => {
    const driveDatabaseManager = getDriveDatabaseManager();
    const downloadService = DownloadService.instance;
    const uploadService = UploadService.instance;
    const cryptoService = CryptoService.instance;
    const networkFacade = new NetworkFacade(getNetworkMock(), uploadService, downloadService, cryptoService);
    const requestHandler = new GETRequestHandler({
      driveFileService: DriveFileService.instance,
      downloadService,
      driveDatabaseManager,
      authService: AuthService.instance,
      cryptoService,
      networkFacade,
    });

    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();

    const request = createWebDavRequestFixture({
      method: 'GET',
      url: requestedFileResource.url,
      headers: {},
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    const expectedError = new NotFoundError(`Resource not found on Internxt Drive at ${requestedFileResource.url}`);

    const getRequestedResourceStub = vi
      .spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValue(requestedFileResource);
    const getAndSearchItemFromResourceStub = vi
      .spyOn(WebDavUtils, 'getAndSearchItemFromResource')
      .mockRejectedValue(expectedError);

    try {
      await requestHandler.handle(request, response);
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect(error).to.be.instanceOf(NotFoundError);
    }
    expect(getRequestedResourceStub).toHaveBeenCalledOnce();
    expect(getAndSearchItemFromResourceStub).toHaveBeenCalledOnce();
  });

  it('When file is requested, then it should write a response with the content', async () => {
    const driveDatabaseManager = getDriveDatabaseManager();
    const downloadService = DownloadService.instance;
    const uploadService = UploadService.instance;
    const cryptoService = CryptoService.instance;
    const authService = AuthService.instance;
    const networkFacade = new NetworkFacade(getNetworkMock(), uploadService, downloadService, cryptoService);
    const requestHandler = new GETRequestHandler({
      driveFileService: DriveFileService.instance,
      downloadService,
      driveDatabaseManager,
      authService,
      cryptoService,
      networkFacade,
    });

    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();

    const request = createWebDavRequestFixture({
      method: 'GET',
      url: requestedFileResource.url,
      headers: {},
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
      header: vi.fn(),
    });

    const mockFile = newFileItem();
    const mockAuthDetails: LoginCredentials = UserCredentialsFixture;

    const getRequestedResourceStub = vi
      .spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValue(requestedFileResource);
    const getAndSearchItemFromResourceStub = vi
      .spyOn(WebDavUtils, 'getAndSearchItemFromResource')
      .mockResolvedValue(mockFile);
    const authDetailsStub = vi.spyOn(authService, 'getAuthDetails').mockResolvedValue(mockAuthDetails);
    const downloadStreamStub = vi
      .spyOn(networkFacade, 'downloadToStream')
      .mockResolvedValue([Promise.resolve(), new AbortController()]);

    await requestHandler.handle(request, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.header).toHaveBeenCalledWith('Content-length', mockFile.size.toString());
    expect(response.header).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
    expect(getRequestedResourceStub).toHaveBeenCalledOnce();
    expect(getAndSearchItemFromResourceStub).toHaveBeenCalledOnce();
    expect(authDetailsStub).toHaveBeenCalledOnce();
    expect(downloadStreamStub).toHaveBeenCalledWith(
      mockFile.bucket,
      mockAuthDetails.user.mnemonic,
      mockFile.fileId,
      expect.any(Object),
      undefined,
    );
  });

  it('When file is requested with Range, then it should write a response with the ranged content', async () => {
    const driveDatabaseManager = getDriveDatabaseManager();
    const downloadService = DownloadService.instance;
    const uploadService = UploadService.instance;
    const cryptoService = CryptoService.instance;
    const authService = AuthService.instance;
    const networkFacade = new NetworkFacade(getNetworkMock(), uploadService, downloadService, cryptoService);
    const requestHandler = new GETRequestHandler({
      driveFileService: DriveFileService.instance,
      downloadService,
      driveDatabaseManager,
      authService,
      cryptoService,
      networkFacade,
    });

    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();

    const mockSize = randomInt(500, 10000);
    const mockFile = newFileItem({ size: mockSize });
    const rangeStart = randomInt(0, 450);

    const range = `bytes=${rangeStart}-${mockSize}`;

    const expectedRangeOptions = NetworkUtils.parseRangeHeader({
      range,
      totalFileSize: mockFile.size,
    });

    const request = createWebDavRequestFixture({
      method: 'GET',
      url: requestedFileResource.url,
      headers: {
        range,
      },
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
      header: vi.fn(),
    });

    const mockAuthDetails: LoginCredentials = UserCredentialsFixture;

    const getRequestedResourceStub = vi
      .spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValue(requestedFileResource);
    const getAndSearchItemFromResourceStub = vi
      .spyOn(WebDavUtils, 'getAndSearchItemFromResource')
      .mockResolvedValue(mockFile);
    const authDetailsStub = vi.spyOn(authService, 'getAuthDetails').mockResolvedValue(mockAuthDetails);
    const downloadStreamStub = vi
      .spyOn(networkFacade, 'downloadToStream')
      .mockResolvedValue([Promise.resolve(), new AbortController()]);

    await requestHandler.handle(request, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.header).toHaveBeenCalledWith('Content-length', (mockSize - rangeStart).toString());
    expect(response.header).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
    expect(getRequestedResourceStub).toHaveBeenCalledOnce();
    expect(getAndSearchItemFromResourceStub).toHaveBeenCalledOnce();
    expect(authDetailsStub).toHaveBeenCalledOnce();
    expect(downloadStreamStub).toHaveBeenCalledWith(
      mockFile.bucket,
      mockAuthDetails.user.mnemonic,
      mockFile.fileId,
      expect.any(Object),
      expectedRangeOptions,
    );
  });
});
