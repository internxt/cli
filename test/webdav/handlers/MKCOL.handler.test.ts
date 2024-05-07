import sinon from 'sinon';
import { MKCOLRequestHandler } from '../../../src/webdav/handlers/MKCOL.handler';
import { getDriveDatabaseManager, getDriveFolderDatabaseFixture } from '../../fixtures/drive-database.fixture';
import { DriveFolderService } from '../../../src/services/drive/drive-folder.service';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';
import { UserSettingsFixture } from '../../fixtures/auth.fixture';
import { expect } from 'chai';
import { CreateFolderResponse } from '@internxt/sdk/dist/drive/storage/types';

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

    const parentFolder = getDriveFolderDatabaseFixture();
    sandbox.stub(driveDatabaseManager, 'findByRelativePath').resolves(parentFolder);
    sandbox.stub(driveDatabaseManager, 'createFolder').resolves();
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
    };

    sandbox
      .stub(driveFolderService, 'createFolder')
      .returns([Promise.resolve(newFolderResponse), { cancel: () => {} }]);
    const request = createWebDavRequestFixture({
      url: '/FolderA/',
      method: 'MKCOL',
      user: UserSettingsFixture,
    });

    const statusStub = sandbox.stub();
    const sendStub = sandbox.stub();

    const response = createWebDavResponseFixture({
      status: statusStub.returns({ send: sendStub }),
    });

    await requestHandler.handle(request, response);

    expect(statusStub.calledWith(201)).to.be.true;
  });
});
