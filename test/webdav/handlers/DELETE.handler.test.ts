import sinon from 'sinon';
import { DELETERequestHandler } from '../../../src/webdav/handlers/DELETE.handler';
import {
  createWebDavRequestFixture,
  createWebDavResponseFixture,
  getRequestedFileResource,
  getRequestedFolderResource,
} from '../../fixtures/webdav.fixture';
import { getDriveDatabaseManager } from '../../fixtures/drive-database.fixture';
import { TrashService } from '../../../src/services/drive/trash.service';
import { expect } from 'chai';
import { NotFoundError } from '../../../src/utils/errors.utils';
import { DriveFileService } from '../../../src/services/drive/drive-file.service';
import { DriveFolderService } from '../../../src/services/drive/drive-folder.service';
import { WebDavUtils } from '../../../src/utils/webdav.utils';
import { newFileItem, newFolderItem } from '../../fixtures/drive.fixture';
import { fail } from 'assert';
import { WebDavRequestedResource } from '../../../src/types/webdav.types';

describe('DELETE request handler', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it('When a WebDav client sends a DELETE request, it should reply with a 404 if the item is not found', async () => {
    const driveDatabaseManager = getDriveDatabaseManager();
    const requestHandler = new DELETERequestHandler({
      driveDatabaseManager,
      trashService: TrashService.instance,
      driveFileService: DriveFileService.instance,
      driveFolderService: DriveFolderService.instance,
    });

    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();

    const request = createWebDavRequestFixture({
      method: 'DELETE',
      url: requestedFileResource.url,
    });
    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sandbox.stub() }),
    });

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

  it('When a WebDav client sends a DELETE request for a file, it should reply with a 204 if the item is deleted correctly', async () => {
    const driveDatabaseManager = getDriveDatabaseManager();
    const trashService = TrashService.instance;
    const requestHandler = new DELETERequestHandler({
      driveDatabaseManager,
      trashService,
      driveFileService: DriveFileService.instance,
      driveFolderService: DriveFolderService.instance,
    });
    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();
    const request = createWebDavRequestFixture({
      method: 'DELETE',
      url: requestedFileResource.url,
    });
    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sandbox.stub() }),
    });

    const mockFile = newFileItem();

    const getRequestedResourceStub = sandbox.stub(WebDavUtils, 'getRequestedResource').resolves(requestedFileResource);
    const getAndSearchItemFromResourceStub = sandbox
      .stub(WebDavUtils, 'getAndSearchItemFromResource')
      .resolves(mockFile);
    const trashItemsStub = sandbox.stub(trashService, 'trashItems').resolves();
    const deleteFileStub = sandbox.stub(driveDatabaseManager, 'deleteFileById').resolves();
    const deleteFolderStub = sandbox.stub(driveDatabaseManager, 'deleteFolderById').rejects();

    await requestHandler.handle(request, response);
    expect(response.status.calledWith(204)).to.be.true;
    expect(getRequestedResourceStub.calledOnce).to.be.true;
    expect(getAndSearchItemFromResourceStub.calledOnce).to.be.true;
    expect(trashItemsStub.calledWith({ items: [{ type: 'file', uuid: mockFile.uuid }] })).to.be.true;
    expect(deleteFileStub.calledOnce).to.be.true;
    expect(deleteFolderStub.calledOnce).to.be.false;
  });

  it('When a WebDav client sends a DELETE request for a folder, it should reply with a 204 if the item is deleted correctly', async () => {
    const driveDatabaseManager = getDriveDatabaseManager();
    const trashService = TrashService.instance;
    const requestHandler = new DELETERequestHandler({
      driveDatabaseManager,
      trashService,
      driveFileService: DriveFileService.instance,
      driveFolderService: DriveFolderService.instance,
    });
    const requestedFolderResource: WebDavRequestedResource = getRequestedFolderResource();

    const request = createWebDavRequestFixture({
      method: 'DELETE',
      url: requestedFolderResource.url,
    });
    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sandbox.stub() }),
    });

    const mockFolder = newFolderItem();

    const getRequestedResourceStub = sandbox
      .stub(WebDavUtils, 'getRequestedResource')
      .resolves(requestedFolderResource);
    const getAndSearchItemFromResourceStub = sandbox
      .stub(WebDavUtils, 'getAndSearchItemFromResource')
      .resolves(mockFolder);
    const trashItemsStub = sandbox.stub(trashService, 'trashItems').resolves();
    const deleteFileStub = sandbox.stub(driveDatabaseManager, 'deleteFileById').rejects();
    const deleteFolderStub = sandbox.stub(driveDatabaseManager, 'deleteFolderById').resolves();

    await requestHandler.handle(request, response);
    expect(response.status.calledWith(204)).to.be.true;
    expect(getRequestedResourceStub.calledOnce).to.be.true;
    expect(getAndSearchItemFromResourceStub.calledOnce).to.be.true;
    expect(trashItemsStub.calledWith({ items: [{ type: 'folder', uuid: mockFolder.uuid }] })).to.be.true;
    expect(deleteFileStub.calledOnce).to.be.false;
    expect(deleteFolderStub.calledOnce).to.be.true;
  });
});
