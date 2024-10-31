import sinon from 'sinon';
import { MKCOLRequestHandler } from '../../../src/webdav/handlers/MKCOL.handler';
import { getDriveDatabaseManager } from '../../fixtures/drive-database.fixture';
import { DriveFolderService } from '../../../src/services/drive/drive-folder.service';
import {
  createWebDavRequestFixture,
  createWebDavResponseFixture,
  getRequestedFolderResource,
} from '../../fixtures/webdav.fixture';
import { UserSettingsFixture } from '../../fixtures/auth.fixture';
import { expect } from 'chai';
import { CreateFolderResponse } from '@internxt/sdk/dist/drive/storage/types';
import { newFolderItem } from '../../fixtures/drive.fixture';
import { WebDavRequestedResource } from '../../../src/types/webdav.types';
import { WebDavUtils } from '../../../src/utils/webdav.utils';

describe('MKCOL request handler', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => sandbox.restore());

  it('When a WebDav client sends a MKCOL request, it should reply with a 201 if success', async () => {
    const driveDatabaseManager = getDriveDatabaseManager();
    const driveFolderService = DriveFolderService.instance;
    const requestHandler = new MKCOLRequestHandler({
      driveDatabaseManager,
      driveFolderService,
    });
    const requestedFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/test',
      folderName: 'FolderA',
    });
    const requestedParentFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/',
      folderName: 'test',
    });

    const request = createWebDavRequestFixture({
      method: 'MKCOL',
      url: requestedFolderResource.url,
      user: UserSettingsFixture,
    });
    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sandbox.stub() }),
    });

    const parentFolder = newFolderItem();
    const newFolderResponse: CreateFolderResponse = {
      parentId: 123,
      bucket: 'bucket1',
      id: 0,
      name: 'folder-1',
      plain_name: 'FolderA',
      createdAt: '',
      updatedAt: '',
      userId: 0,
      uuid: '1234-5678-9012-3456',
      parentUuid: '0123-5678-9012-3456',
    };

    const getRequestedResourceStub = sandbox
      .stub(WebDavUtils, 'getRequestedResource')
      .onFirstCall()
      .resolves(requestedFolderResource)
      .onSecondCall()
      .resolves(requestedParentFolderResource);
    const getAndSearchItemFromResourceStub = sandbox
      .stub(WebDavUtils, 'getAndSearchItemFromResource')
      .resolves(parentFolder);
    const createFolderStub = sandbox
      .stub(driveFolderService, 'createFolder')
      .returns([Promise.resolve(newFolderResponse), { cancel: () => {} }]);
    const createDatabaseFolderStub = sandbox.stub(driveDatabaseManager, 'createFolder').resolves();

    await requestHandler.handle(request, response);
    expect(response.status.calledWith(201)).to.be.true;
    expect(getRequestedResourceStub.calledTwice).to.be.true;
    expect(getAndSearchItemFromResourceStub.calledOnce).to.be.true;
    expect(createFolderStub.calledWith({ folderName: requestedFolderResource.name, parentFolderId: parentFolder.id }))
      .to.be.true;
    expect(createDatabaseFolderStub.calledOnce).to.be.true;
  });
});
