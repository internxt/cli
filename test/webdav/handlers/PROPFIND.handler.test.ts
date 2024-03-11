import sinon from 'sinon';
import { PROPFINDRequestHandler } from '../../../src/webdav/handlers/PROPFIND.handler';

import { ConfigService } from '../../../src/services/config.service';
import { DriveFolderService } from '../../../src/services/drive/drive-folder.service';
import { UserSettingsFixture } from '../../fixtures/auth.fixture';
import { newFolder, newPaginatedFolder } from '../../fixtures/drive.fixture';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';
import path from 'path';
import { getDriveFolderRealmSchemaFixture, getDriveRealmManager } from '../../fixtures/drive-realm.fixture';

describe('PROPFIND request handler', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it('When a WebDav client sends a PROPFIND request for the root folder, and there is no content, should return the correct XML', async () => {
    const configService = ConfigService.instance;
    const driveFolderService = DriveFolderService.instance;

    sandbox
      .stub(configService, 'readUser')
      .resolves({ user: UserSettingsFixture, token: 'TOKEN', newToken: 'NEW_TOKEN', mnemonic: 'MNEMONIC' });

    const folderFixture = newFolder({
      id: UserSettingsFixture.root_folder_id,
    });
    sandbox.stub(driveFolderService, 'getFolderMetaById').resolves(folderFixture);
    sandbox.stub(driveFolderService, 'getFolderContent').resolves({ folders: [], files: [] });
    const requestHandler = new PROPFINDRequestHandler(
      { debug: true },
      {
        driveFolderService,
        driveRealmManager: getDriveRealmManager(),
      },
    );

    const request = createWebDavRequestFixture({
      url: '/',
      method: 'PROPFIND',
      user: UserSettingsFixture,
    });

    const sendStub = sandbox.stub();

    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sendStub }),
    });

    await requestHandler.handle(request, response);
    sinon.assert.calledWith(response.status, 200);
    sinon.assert.calledWith(
      sendStub,
      '<?xml version="1.0" encoding="utf-8" ?><multistatus xmlns:D="DAV:"></multistatus>',
    );
  });

  it('When a WebDav client sends a PROPFIND request for the root folder, and there is content, should return the correct XML', async () => {
    const configService = ConfigService.instance;
    const driveFolderService = DriveFolderService.instance;

    sandbox
      .stub(configService, 'readUser')
      .resolves({ user: UserSettingsFixture, token: 'TOKEN', newToken: 'NEW_TOKEN', mnemonic: 'MNEMONIC' });

    const folderFixture = newFolder({
      id: UserSettingsFixture.root_folder_id,
    });
    const paginatedFolder1 = newPaginatedFolder({
      plainName: 'folder_1',
      updatedAt: new Date('2024-03-04T15:11:01.000Z'),
      uuid: 'FOLDER_UUID_1',
    });

    sandbox.stub(driveFolderService, 'getFolderMetaById').resolves(folderFixture);
    sandbox.stub(driveFolderService, 'getFolderContent').resolves({
      folders: [paginatedFolder1],
      files: [],
    });
    const requestHandler = new PROPFINDRequestHandler(
      { debug: true },
      {
        driveFolderService,
        driveRealmManager: getDriveRealmManager(),
      },
    );

    const request = createWebDavRequestFixture({
      url: '/',
      method: 'PROPFIND',
    });

    const sendStub = sandbox.stub();
    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sendStub }),
    });

    await requestHandler.handle(request, response);
    sinon.assert.calledWith(response.status, 200);
    sinon.assert.calledWith(
      sendStub,
      `<?xml version="1.0" encoding="utf-8" ?><multistatus xmlns:D="DAV:"><response><href>${path.join('/', 'folder_1', '/')}</href><propstat><status>HTTP/1.1 200 OK</status><prop><displayname>folder_1</displayname><getlastmodified>Mon, 04 Mar 2024 15:11:01 GMT</getlastmodified><getcontentlength>0</getcontentlength><resourcetype><collection></collection></resourcetype></prop></propstat></response></multistatus>`,
    );
  });

  it('When a WebDav client sends a PROPFIND request for a file, should return the correct XML', async () => {
    const configService = ConfigService.instance;
    const driveFolderService = DriveFolderService.instance;

    sandbox
      .stub(configService, 'readUser')
      .resolves({ user: UserSettingsFixture, token: 'TOKEN', newToken: 'NEW_TOKEN', mnemonic: 'MNEMONIC' });

    const driveRealmManager = getDriveRealmManager();
    sandbox.stub(driveRealmManager, 'findByRelativePath').resolves(getDriveFolderRealmSchemaFixture());

    const requestHandler = new PROPFINDRequestHandler(
      { debug: true },
      {
        driveFolderService,
        driveRealmManager,
      },
    );

    const request = createWebDavRequestFixture({
      url: '/file.png',
      method: 'PROPFIND',
    });

    const sendStub = sandbox.stub();
    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sendStub }),
    });

    await requestHandler.handle(request, response);
    sinon.assert.calledWith(response.status, 200);
    // TODO: Test the XML response
  });

  it('When a WebDav client sends a PROPFIND request for a folder, should return the correct XML', async () => {
    const configService = ConfigService.instance;
    const driveFolderService = DriveFolderService.instance;

    sandbox
      .stub(configService, 'readUser')
      .resolves({ user: UserSettingsFixture, token: 'TOKEN', newToken: 'NEW_TOKEN', mnemonic: 'MNEMONIC' });

    const driveRealmManager = getDriveRealmManager();
    sandbox.stub(driveRealmManager, 'findByRelativePath').resolves(getDriveFolderRealmSchemaFixture());
    const requestHandler = new PROPFINDRequestHandler(
      { debug: true },
      {
        driveFolderService,
        driveRealmManager,
      },
    );

    const request = createWebDavRequestFixture({
      url: '/folder_a',
      method: 'PROPFIND',
    });

    const sendStub = sandbox.stub();
    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sendStub }),
    });

    await requestHandler.handle(request, response);
    sinon.assert.calledWith(response.status, 200);
    // TODO: Test the XML response
  });

  it('When a WebDav client sends a PROPFIND request for a folder and it does not exists, should return a 404', async () => {
    const configService = ConfigService.instance;
    const driveFolderService = DriveFolderService.instance;

    sandbox
      .stub(configService, 'readUser')
      .resolves({ user: UserSettingsFixture, token: 'TOKEN', newToken: 'NEW_TOKEN', mnemonic: 'MNEMONIC' });

    const driveRealmManager = getDriveRealmManager();
    sandbox.stub(driveRealmManager, 'findByRelativePath').resolves(null);
    const requestHandler = new PROPFINDRequestHandler(
      { debug: true },
      {
        driveFolderService,
        driveRealmManager,
      },
    );

    const request = createWebDavRequestFixture({
      url: '/folder_a',
      method: 'PROPFIND',
    });

    const sendStub = sandbox.stub();
    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sendStub }),
    });

    await requestHandler.handle(request, response);
    sinon.assert.calledWith(response.status, 404);
  });
});
