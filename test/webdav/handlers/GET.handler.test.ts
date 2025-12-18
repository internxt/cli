import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fail } from 'node:assert';
import {
  createWebDavRequestFixture,
  createWebDavResponseFixture,
  getRequestedFileResource,
} from '../../fixtures/webdav.fixture';
import { GETRequestHandler } from '../../../src/webdav/handlers/GET.handler';
import { DriveFileService } from '../../../src/services/drive/drive-file.service';
import { CryptoService } from '../../../src/services/crypto.service';
import { DownloadService } from '../../../src/services/network/download.service';
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
import { Environment } from '@internxt/inxt-js';
import { ConfigService } from '../../../src/services/config.service';
import { UserFixture } from '../../fixtures/auth.fixture';

describe('GET request handler', () => {
  let networkFacade: NetworkFacade;
  let sut: GETRequestHandler;
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
    networkFacade = new NetworkFacade(
      getNetworkMock(),
      getEnvironmentMock(),
      DownloadService.instance,
      CryptoService.instance,
    );
    sut = new GETRequestHandler({
      driveFileService: DriveFileService.instance,
      downloadService: DownloadService.instance,
      authService: AuthService.instance,
      cryptoService: CryptoService.instance,
      networkFacade,
    });

    vi.restoreAllMocks();
  });

  it('should throw a NotFoundError when the Drive file is not found', async () => {
    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();

    const request = createWebDavRequestFixture({
      method: 'GET',
      url: requestedFileResource.url,
      headers: {},
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    const getRequestedResourceStub = vi
      .spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValue(requestedFileResource);
    const getFileMetadataStub = vi
      .spyOn(DriveFileService.instance, 'getFileMetadataByPath')
      .mockRejectedValue(new Error('File not found'));

    try {
      await sut.handle(request, response);
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect(error).to.be.instanceOf(NotFoundError);
    }
    expect(getRequestedResourceStub).toHaveBeenCalledOnce();
    expect(getFileMetadataStub).toHaveBeenCalledOnce();
  });

  it('should write a response with the content when a file is requested', async () => {
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
    const getFileMetadataStub = vi
      .spyOn(DriveFileService.instance, 'getFileMetadataByPath')
      .mockResolvedValue(mockFile);
    const authDetailsStub = vi.spyOn(AuthService.instance, 'getAuthDetails').mockResolvedValue(mockAuthDetails);
    const downloadStreamStub = vi
      .spyOn(networkFacade, 'downloadToStream')
      .mockResolvedValue([Promise.resolve(), new AbortController()]);

    await sut.handle(request, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.header).toHaveBeenCalledWith('Content-length', mockFile.size.toString());
    expect(response.header).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
    expect(getRequestedResourceStub).toHaveBeenCalledOnce();
    expect(getFileMetadataStub).toHaveBeenCalledOnce();
    expect(authDetailsStub).toHaveBeenCalledOnce();
    expect(downloadStreamStub).toHaveBeenCalledWith(
      mockFile.bucket,
      mockAuthDetails.user.mnemonic,
      mockFile.fileId,
      mockFile.size,
      expect.any(Object),
      undefined,
    );
  });

  it('should write a response with the ranged content when a file is requested with Range', async () => {
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
    const getFileMetadataStub = vi
      .spyOn(DriveFileService.instance, 'getFileMetadataByPath')
      .mockResolvedValue(mockFile);
    const authDetailsStub = vi.spyOn(AuthService.instance, 'getAuthDetails').mockResolvedValue(mockAuthDetails);
    const downloadStreamStub = vi
      .spyOn(networkFacade, 'downloadToStream')
      .mockResolvedValue([Promise.resolve(), new AbortController()]);

    await sut.handle(request, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.header).toHaveBeenCalledWith('Content-length', (mockSize - rangeStart).toString());
    expect(response.header).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
    expect(getRequestedResourceStub).toHaveBeenCalledOnce();
    expect(getFileMetadataStub).toHaveBeenCalledOnce();
    expect(authDetailsStub).toHaveBeenCalledOnce();
    expect(downloadStreamStub).toHaveBeenCalledWith(
      mockFile.bucket,
      mockAuthDetails.user.mnemonic,
      mockFile.fileId,
      mockSize - rangeStart,
      expect.any(Object),
      expectedRangeOptions,
    );
  });

  it('should write a response with no content when an empty file is requested', async () => {
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

    const mockFile = newFileItem({ size: 0 });
    const mockAuthDetails: LoginCredentials = UserCredentialsFixture;

    const getRequestedResourceStub = vi
      .spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValue(requestedFileResource);
    const getFileMetadataStub = vi
      .spyOn(DriveFileService.instance, 'getFileMetadataByPath')
      .mockResolvedValue(mockFile);
    const authDetailsStub = vi.spyOn(AuthService.instance, 'getAuthDetails').mockResolvedValue(mockAuthDetails);
    const downloadStreamStub = vi
      .spyOn(networkFacade, 'downloadToStream')
      .mockResolvedValue([Promise.resolve(), new AbortController()]);

    await sut.handle(request, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(response.header).toHaveBeenCalledWith('Content-length', Number(0).toString());
    expect(response.header).toHaveBeenCalledWith('Content-Type', 'application/octet-stream');
    expect(getRequestedResourceStub).toHaveBeenCalledOnce();
    expect(getFileMetadataStub).toHaveBeenCalledOnce();
    expect(authDetailsStub).toHaveBeenCalledOnce();
    expect(downloadStreamStub).not.toHaveBeenCalled();
  });
});
