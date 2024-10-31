import sinon from 'sinon';
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
import { expect } from 'chai';
import { NotFoundError, NotImplementedError } from '../../../src/utils/errors.utils';
import { SdkManager } from '../../../src/services/sdk-manager.service';
import { NetworkFacade } from '../../../src/services/network/network-facade.service';
import { UserFixture } from '../../fixtures/auth.fixture';
import { fail } from 'node:assert';
import { WebDavUtils } from '../../../src/utils/webdav.utils';
import { WebDavRequestedResource } from '../../../src/types/webdav.types';
import { newFileItem } from '../../fixtures/drive.fixture';

describe('GET request handler', () => {
  const sandbox = sinon.createSandbox();
  const getNetworkMock = () => {
    return SdkManager.instance.getNetwork({
      user: 'user',
      pass: 'pass',
    });
  };

  afterEach(() => {
    sandbox.restore();
  });

  it('When a WebDav client sends a GET request, and it contains a content-range header, then it should throw a NotImplementedError', async () => {
    const networkFacade = new NetworkFacade(
      getNetworkMock(),
      UploadService.instance,
      DownloadService.instance,
      CryptoService.instance,
    );
    const sut = new GETRequestHandler({
      driveFileService: DriveFileService.instance,
      uploadService: UploadService.instance,
      downloadService: DownloadService.instance,
      driveDatabaseManager: getDriveDatabaseManager(),
      authService: AuthService.instance,
      cryptoService: CryptoService.instance,
      networkFacade,
    });

    const request = createWebDavRequestFixture({
      method: 'GET',
      url: '/file.txt',
      headers: {
        'content-range': 'bytes 0-100/200',
      },
    });
    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sandbox.stub() }),
    });

    try {
      await sut.handle(request, response);
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect(error).to.be.instanceOf(NotImplementedError);
    }
  });

  it('When a WebDav client sends a GET request, and the Drive file is not found, should throw a NotFoundError', async () => {
    const driveDatabaseManager = getDriveDatabaseManager();
    const downloadService = DownloadService.instance;
    const uploadService = UploadService.instance;
    const cryptoService = CryptoService.instance;
    const networkFacade = new NetworkFacade(getNetworkMock(), uploadService, downloadService, cryptoService);
    const requestHandler = new GETRequestHandler({
      driveFileService: DriveFileService.instance,
      uploadService,
      downloadService,
      driveDatabaseManager,
      authService: AuthService.instance,
      cryptoService,
      networkFacade,
    });

    const request = createWebDavRequestFixture({
      method: 'GET',
      url: '/file.txt',
      headers: {},
    });
    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sandbox.stub() }),
    });

    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();

    const expectedError = new NotFoundError(`Resource not found on Internxt Drive at ${requestedFileResource.url}`);

    const getRequestedResourceStub = sandbox.stub(WebDavUtils, 'getRequestedResource').resolves(requestedFileResource);
    const getAndSearchItemFromResourceStub = sandbox
      .stub(WebDavUtils, 'getAndSearchItemFromResource')
      .throws(expectedError);

    try {
      await requestHandler.handle(request, response);
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect(error).to.be.instanceOf(NotFoundError);
    }
    expect(getRequestedResourceStub.calledOnce).to.be.true;
    expect(getAndSearchItemFromResourceStub.calledOnce).to.be.true;
  });

  it('When a WebDav client sends a GET request, and the Drive file is found, should write a response with the content', async () => {
    const driveDatabaseManager = getDriveDatabaseManager();
    const downloadService = DownloadService.instance;
    const uploadService = UploadService.instance;
    const cryptoService = CryptoService.instance;
    const authService = AuthService.instance;
    const networkFacade = new NetworkFacade(getNetworkMock(), uploadService, downloadService, cryptoService);
    const requestHandler = new GETRequestHandler({
      driveFileService: DriveFileService.instance,
      uploadService,
      downloadService,
      driveDatabaseManager,
      authService,
      cryptoService,
      networkFacade,
    });

    const request = createWebDavRequestFixture({
      method: 'GET',
      url: '/file.txt',
      headers: {},
    });
    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sandbox.stub() }),
    });

    const mockFile = newFileItem();
    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();
    const mockAuthDetails = { mnemonic: 'MNEMONIC', token: 'TOKEN', newToken: 'NEW_TOKEN', user: UserFixture };

    const getRequestedResourceStub = sandbox.stub(WebDavUtils, 'getRequestedResource').resolves(requestedFileResource);
    const getAndSearchItemFromResourceStub = sandbox
      .stub(WebDavUtils, 'getAndSearchItemFromResource')
      .resolves(mockFile);
    const authDetailsStub = sandbox.stub(authService, 'getAuthDetails').resolves(mockAuthDetails);
    const downloadStreamStub = sandbox
      .stub(networkFacade, 'downloadToStream')
      .resolves([Promise.resolve(), new AbortController()]);

    await requestHandler.handle(request, response);
    expect(response.status.calledWith(200)).to.be.true;
    expect(getRequestedResourceStub.calledOnce).to.be.true;
    expect(getAndSearchItemFromResourceStub.calledOnce).to.be.true;
    expect(authDetailsStub.calledOnce).to.be.true;
    expect(downloadStreamStub.calledWith(mockFile.bucket, mockAuthDetails.mnemonic, mockFile.fileId)).to.be.true;
  });
});
