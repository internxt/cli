import sinon from 'sinon';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';
import { GETRequestHandler } from '../../../src/webdav/handlers/GET.handler';
import { DriveFileService } from '../../../src/services/drive/drive-file.service';
import { getDriveRealmManager } from '../../fixtures/drive-realm.fixture';
import { CryptoService } from '../../../src/services/crypto.service';
import { DownloadService } from '../../../src/services/network/download.service';
import { UploadService } from '../../../src/services/network/upload.service';
import { AuthService } from '../../../src/services/auth.service';
import { expect } from 'chai';
import { NotFoundError, NotImplementedError } from '../../../src/utils/errors.utils';
import { SdkManager } from '../../../src/services/sdk-manager.service';
import { NetworkFacade } from '../../../src/services/network/network-facade.service';

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

  it('When a WebDav client sends a GET request, and it contains a content-range header, should throw a NotImplementedError ', async () => {
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
      driveRealmManager: getDriveRealmManager(),
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
      expect(true).to.be.false;
    } catch (error) {
      expect(error).to.be.instanceOf(NotImplementedError);
    }
  });

  it('When a WebDav client sends a GET request, and the Drive file is not found, should throw a NotFoundError', async () => {
    const driveRealmManager = getDriveRealmManager();
    const downloadService = DownloadService.instance;
    const uploadService = UploadService.instance;
    const cryptoService = CryptoService.instance;
    const networkFacade = new NetworkFacade(getNetworkMock(), uploadService, downloadService, cryptoService);
    const sut = new GETRequestHandler({
      driveFileService: DriveFileService.instance,
      uploadService,
      downloadService,
      driveRealmManager,
      authService: AuthService.instance,
      cryptoService,
      networkFacade,
    });

    const request = createWebDavRequestFixture({
      method: 'GET',
      url: '/file.txt',
      headers: {},
    });

    sandbox.stub(driveRealmManager, 'findByRelativePath').resolves(null);
    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sandbox.stub() }),
    });

    try {
      await sut.handle(request, response);
      expect(true).to.be.false;
    } catch (error) {
      expect(error).to.be.instanceOf(NotFoundError);
    }
  });
});
