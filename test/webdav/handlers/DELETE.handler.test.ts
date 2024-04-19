import sinon from 'sinon';
import { DELETERequestHandler } from '../../../src/webdav/handlers/DELETE.handler';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';
import {
  getDriveDatabaseManager,
  getDriveFileDatabaseFixture,
  getDriveFolderDatabaseFixture,
} from '../../fixtures/drive-database.fixture';
import { TrashService } from '../../../src/services/drive/trash.service';
import { expect } from 'chai';
import { NotFoundError } from '../../../src/utils/errors.utils';
import { create } from 'domain';

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
    });

    const request = createWebDavRequestFixture({
      method: 'DELETE',
      url: '/file.txt',
    });

    sandbox.stub(driveDatabaseManager, 'findByRelativePath').resolves(null);

    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sandbox.stub() }),
    });

    try {
      await requestHandler.handle(request, response);
      expect(true).to.be.false;
    } catch (error) {
      expect(error).to.be.instanceOf(NotFoundError);
    }
  });
  it('When a WebDav client sends a DELETE request for a file, it should reply with a 204 if the item is deleted correctly', async () => {
    const driveDatabaseManager = getDriveDatabaseManager();
    const trashService = TrashService.instance;
    const requestHandler = new DELETERequestHandler({
      driveDatabaseManager,
      trashService,
    });

    const request = createWebDavRequestFixture({
      method: 'DELETE',
      url: '/file.txt',
    });

    const driveFileDatabaseObject = getDriveFileDatabaseFixture({});

    sandbox.stub(driveDatabaseManager, 'findByRelativePath').resolves(driveFileDatabaseObject);
    const updateFileStub = sandbox.stub(driveDatabaseManager, 'updateFile').resolves();
    const trashItemsStub = sandbox.stub(trashService, 'trashItems').resolves();

    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sandbox.stub() }),
    });

    await requestHandler.handle(request, response);
    expect(response.status.calledWith(204)).to.be.true;
    expect(updateFileStub.calledOnce).to.be.true;
    expect(trashItemsStub.calledWith({ items: [{ type: 'file', uuid: driveFileDatabaseObject.uuid }] })).to.be.true;
  });

  it('When a WebDav client sends a DELETE request for a folder, it should reply with a 204 if the item is deleted correctly', async () => {
    const driveDatabaseManager = getDriveDatabaseManager();
    const trashService = TrashService.instance;
    const requestHandler = new DELETERequestHandler({
      driveDatabaseManager,
      trashService,
    });

    const request = createWebDavRequestFixture({
      method: 'DELETE',
      url: '/folder/',
    });

    const driveFolderDatabaseObject = getDriveFolderDatabaseFixture({});

    sandbox.stub(driveDatabaseManager, 'findByRelativePath').resolves(driveFolderDatabaseObject);
    const updateFolderStub = sandbox.stub(driveDatabaseManager, 'updateFolder').resolves();
    const trashItemsStub = sandbox.stub(trashService, 'trashItems').resolves();

    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sandbox.stub() }),
    });

    await requestHandler.handle(request, response);
    expect(response.status.calledWith(204)).to.be.true;
    expect(updateFolderStub.calledOnce).to.be.true;
    expect(trashItemsStub.calledWith({ items: [{ type: 'folder', uuid: driveFolderDatabaseObject.uuid }] })).to.be.true;
  });
});
