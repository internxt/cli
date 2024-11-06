import sinon from 'sinon';
import {
  createWebDavRequestFixture,
  createWebDavResponseFixture,
  getRequestedFileResource,
  getRequestedFolderResource,
} from '../../fixtures/webdav.fixture';
import { DriveFileService } from '../../../src/services/drive/drive-file.service';
import { CryptoService } from '../../../src/services/crypto.service';
import { DownloadService } from '../../../src/services/network/download.service';
import { UploadService } from '../../../src/services/network/upload.service';
import { AuthService } from '../../../src/services/auth.service';
import { expect } from 'chai';
import { ConflictError, UnsupportedMediaTypeError } from '../../../src/utils/errors.utils';
import { SdkManager } from '../../../src/services/sdk-manager.service';
import { NetworkFacade } from '../../../src/services/network/network-facade.service';
import { UserFixture } from '../../fixtures/auth.fixture';
import { PUTRequestHandler } from '../../../src/webdav/handlers/PUT.handler';
import { getDriveDatabaseManager } from '../../fixtures/drive-database.fixture';
import { fail } from 'assert';
import { DriveFolderService } from '../../../src/services/drive/drive-folder.service';
import { TrashService } from '../../../src/services/drive/trash.service';
import { WebDavRequestedResource } from '../../../src/types/webdav.types';
import { WebDavUtils } from '../../../src/utils/webdav.utils';
import { newFileItem, newFolderItem } from '../../fixtures/drive.fixture';

describe('PUT request handler', () => {
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

  it('When a WebDav client sends a PUT request and it contains a content-length of 0, then it should throw an UnsupportedMediaTypeError', async () => {
    const networkFacade = new NetworkFacade(
      getNetworkMock(),
      UploadService.instance,
      DownloadService.instance,
      CryptoService.instance,
    );
    const sut = new PUTRequestHandler({
      driveFileService: DriveFileService.instance,
      driveFolderService: DriveFolderService.instance,
      driveDatabaseManager: getDriveDatabaseManager(),
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
      status: sandbox.stub().returns({ send: sandbox.stub() }),
    });

    try {
      await sut.handle(request, response);
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect(error).to.be.instanceOf(UnsupportedMediaTypeError);
    }
  });

  it('When a WebDav client sends a PUT request, and the Drive destination folder is not found, then it should throw a ConflictError', async () => {
    const driveDatabaseManager = getDriveDatabaseManager();
    const downloadService = DownloadService.instance;
    const uploadService = UploadService.instance;
    const cryptoService = CryptoService.instance;
    const networkFacade = new NetworkFacade(getNetworkMock(), uploadService, downloadService, cryptoService);
    const sut = new PUTRequestHandler({
      driveFileService: DriveFileService.instance,
      driveFolderService: DriveFolderService.instance,
      authService: AuthService.instance,
      trashService: TrashService.instance,
      networkFacade,
      driveDatabaseManager,
    });
    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();
    const requestedParentFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/',
      folderName: '',
    });

    const request = createWebDavRequestFixture({
      method: 'PUT',
      url: requestedFileResource.url,
      headers: {
        'content-length': '100',
      },
    });

    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sandbox.stub() }),
    });

    const getRequestedResourceStub = sandbox
      .stub(WebDavUtils, 'getRequestedResource')
      .onFirstCall()
      .resolves(requestedFileResource)
      .onSecondCall()
      .resolves(requestedParentFolderResource);
    const getAndSearchItemFromResourceStub = sandbox
      .stub(WebDavUtils, 'getAndSearchItemFromResource')
      .resolves(undefined);

    try {
      await sut.handle(request, response);
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect(error).to.be.instanceOf(ConflictError);
    }
    expect(getRequestedResourceStub.calledTwice).to.be.true;
    expect(getAndSearchItemFromResourceStub.calledOnce).to.be.true;
  });

  it('When a WebDav client sends a PUT request, and the Drive destination folder is found, then it should upload the file to the folder', async () => {
    const driveDatabaseManager = getDriveDatabaseManager();
    const downloadService = DownloadService.instance;
    const uploadService = UploadService.instance;
    const cryptoService = CryptoService.instance;
    const authService = AuthService.instance;
    const networkFacade = new NetworkFacade(getNetworkMock(), uploadService, downloadService, cryptoService);
    const sut = new PUTRequestHandler({
      driveFileService: DriveFileService.instance,
      driveFolderService: DriveFolderService.instance,
      authService: AuthService.instance,
      trashService: TrashService.instance,
      networkFacade,
      driveDatabaseManager,
    });

    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();
    const requestedParentFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/',
      folderName: '',
    });
    const folderFixture = newFolderItem({ name: requestedParentFolderResource.name });

    const request = createWebDavRequestFixture({
      method: 'PUT',
      url: requestedFileResource.url,
      headers: {
        'content-length': '100',
      },
    });

    const sendStub = sandbox.stub();
    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sendStub }),
    });

    const getRequestedResourceStub = sandbox
      .stub(WebDavUtils, 'getRequestedResource')
      .onFirstCall()
      .resolves(requestedFileResource)
      .onSecondCall()
      .resolves(requestedParentFolderResource);
    const getAndSearchItemFromResourceStub = sandbox
      .stub(WebDavUtils, 'getAndSearchItemFromResource')
      .onFirstCall()
      .resolves(folderFixture)
      .onSecondCall()
      .rejects();
    const getAuthDetailsStub = sandbox
      .stub(authService, 'getAuthDetails')
      .resolves({ mnemonic: 'MNEMONIC', token: 'TOKEN', newToken: 'NEW_TOKEN', user: UserFixture });
    const uploadFromStreamStub = sandbox
      .stub(networkFacade, 'uploadFromStream')
      .resolves([Promise.resolve({ fileId: '09218313209', hash: Buffer.from('test') }), new AbortController()]);
    const createDriveFileStub = sandbox.stub(DriveFileService.instance, 'createFile').resolves();
    const createDBFileStub = sandbox.stub(driveDatabaseManager, 'createFile').resolves();

    await sut.handle(request, response);
    expect(response.status.calledWith(200)).to.be.true;
    expect(getRequestedResourceStub.calledTwice).to.be.true;
    expect(getAndSearchItemFromResourceStub.calledTwice).to.be.true;
    expect(getAuthDetailsStub.calledOnce).to.be.true;
    expect(uploadFromStreamStub.calledOnce).to.be.true;
    expect(createDriveFileStub.calledOnce).to.be.true;
    expect(createDBFileStub.calledOnce).to.be.true;
  });

  it('When a WebDav client sends a PUT request, and the file already exists, then it should upload and replace the file to the folder', async () => {
    const driveDatabaseManager = getDriveDatabaseManager();
    const downloadService = DownloadService.instance;
    const uploadService = UploadService.instance;
    const cryptoService = CryptoService.instance;
    const authService = AuthService.instance;
    const trashService = TrashService.instance;
    const networkFacade = new NetworkFacade(getNetworkMock(), uploadService, downloadService, cryptoService);
    const sut = new PUTRequestHandler({
      driveFileService: DriveFileService.instance,
      driveFolderService: DriveFolderService.instance,
      authService: AuthService.instance,
      trashService: TrashService.instance,
      networkFacade,
      driveDatabaseManager,
    });

    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();
    const requestedParentFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/',
      folderName: '',
    });
    const folderFixture = newFolderItem({ name: requestedParentFolderResource.name });
    const fileFixture = newFileItem({ folderId: folderFixture.id, folderUuid: folderFixture.uuid });

    const request = createWebDavRequestFixture({
      method: 'PUT',
      url: requestedFileResource.url,
      headers: {
        'content-length': '100',
      },
    });

    const sendStub = sandbox.stub();
    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sendStub }),
    });

    const getRequestedResourceStub = sandbox
      .stub(WebDavUtils, 'getRequestedResource')
      .onFirstCall()
      .resolves(requestedFileResource)
      .onSecondCall()
      .resolves(requestedParentFolderResource);
    const getAndSearchItemFromResourceStub = sandbox
      .stub(WebDavUtils, 'getAndSearchItemFromResource')
      .onFirstCall()
      .resolves(folderFixture)
      .onSecondCall()
      .resolves(fileFixture);
    const deleteDBFileStub = sandbox.stub(driveDatabaseManager, 'deleteFileById').resolves();
    const deleteDriveFileStub = sandbox.stub(trashService, 'trashItems').resolves();
    const getAuthDetailsStub = sandbox
      .stub(authService, 'getAuthDetails')
      .resolves({ mnemonic: 'MNEMONIC', token: 'TOKEN', newToken: 'NEW_TOKEN', user: UserFixture });
    const uploadFromStreamStub = sandbox
      .stub(networkFacade, 'uploadFromStream')
      .resolves([Promise.resolve({ fileId: '09218313209', hash: Buffer.from('test') }), new AbortController()]);
    const createDriveFileStub = sandbox.stub(DriveFileService.instance, 'createFile').resolves();
    const createDBFileStub = sandbox.stub(driveDatabaseManager, 'createFile').resolves();

    await sut.handle(request, response);
    expect(response.status.calledWith(200)).to.be.true;
    expect(getRequestedResourceStub.calledTwice).to.be.true;
    expect(getAndSearchItemFromResourceStub.calledTwice).to.be.true;
    expect(getAuthDetailsStub.calledOnce).to.be.true;
    expect(uploadFromStreamStub.calledOnce).to.be.true;
    expect(createDriveFileStub.calledOnce).to.be.true;
    expect(createDBFileStub.calledOnce).to.be.true;
    expect(deleteDBFileStub.calledOnce).to.be.true;
    expect(deleteDriveFileStub.calledOnce).to.be.true;
  });
});
