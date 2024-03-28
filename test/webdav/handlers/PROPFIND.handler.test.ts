import sinon from 'sinon';
import { PROPFINDRequestHandler } from '../../../src/webdav/handlers/PROPFIND.handler';
import { ConfigService } from '../../../src/services/config.service';
import { DriveFolderService } from '../../../src/services/drive/drive-folder.service';
import { UserSettingsFixture } from '../../fixtures/auth.fixture';
import { newFolderItem, newPaginatedFolder } from '../../fixtures/drive.fixture';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';
import {
  getDriveFileRealmSchemaFixture,
  getDriveFolderRealmSchemaFixture,
  getDriveRealmManager,
} from '../../fixtures/drive-realm.fixture';
import { FormatUtils } from '../../../src/utils/format.utils';

describe('PROPFIND request handler', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it('When a WebDav client sends a PROPFIND request for the root folder, and there is no content, should return the correct XML', async () => {
    const configService = ConfigService.instance;
    const driveFolderService = DriveFolderService.instance;

    sandbox.stub(configService, 'readUser').resolves({
      user: UserSettingsFixture,
      root_folder_uuid: 'test_root_folder_uuid',
      token: 'TOKEN',
      newToken: 'NEW_TOKEN',
      mnemonic: 'MNEMONIC',
    });

    const folderFixture = newFolderItem({
      id: UserSettingsFixture.root_folder_id,
    });
    sandbox.stub(driveFolderService, 'getFolderMetaById').resolves(folderFixture);
    sandbox.stub(driveFolderService, 'getFolderMetaByUuid').resolves(folderFixture);
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
      `<?xml version="1.0" encoding="utf-8" ?><D:multistatus xmlns:D="DAV:"><D:response><D:href>/</D:href><D:propstat><D:status>HTTP/1.1 200 OK</D:status><D:prop><D:getcontenttype>application/octet-stream</D:getcontenttype><x1:lastmodified xmlns:x1="SAR:">${FormatUtils.formatDateForWebDav(folderFixture.updatedAt)}</x1:lastmodified><x2:executable xmlns:x2="http://apache.org/dav/props/">F</x2:executable><x3:Win32FileAttributes xmlns:x3="urn:schemas-microsoft-com:">00000030</x3:Win32FileAttributes><D:resourcetype><D:collection/></D:resourcetype></D:prop></D:propstat></D:response></D:multistatus>`,
    );
  });

  it('When a WebDav client sends a PROPFIND request for the root folder, and there is content, should return the correct XML', async () => {
    const configService = ConfigService.instance;
    const driveFolderService = DriveFolderService.instance;

    sandbox.stub(configService, 'readUser').resolves({
      user: UserSettingsFixture,
      root_folder_uuid: 'test_root_folder_uuid',
      token: 'TOKEN',
      newToken: 'NEW_TOKEN',
      mnemonic: 'MNEMONIC',
    });

    const folderFixture = newFolderItem({
      id: UserSettingsFixture.root_folder_id,
    });
    const paginatedFolder1 = newPaginatedFolder({
      plainName: 'folder_1',
      updatedAt: new Date('2024-03-04T15:11:01.000Z'),
      uuid: 'FOLDER_UUID_1',
    });

    sandbox.stub(driveFolderService, 'getFolderMetaById').resolves(folderFixture);
    sandbox.stub(driveFolderService, 'getFolderMetaByUuid').resolves(folderFixture);
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
      `<?xml version="1.0" encoding="utf-8" ?><D:multistatus xmlns:D="DAV:"><D:response><D:href>/</D:href><D:propstat><D:status>HTTP/1.1 200 OK</D:status><D:prop><D:getcontenttype>application/octet-stream</D:getcontenttype><x1:lastmodified xmlns:x1="SAR:">${FormatUtils.formatDateForWebDav(folderFixture.updatedAt)}</x1:lastmodified><x2:executable xmlns:x2="http://apache.org/dav/props/">F</x2:executable><x3:Win32FileAttributes xmlns:x3="urn:schemas-microsoft-com:">00000030</x3:Win32FileAttributes><D:resourcetype><D:collection/></D:resourcetype></D:prop></D:propstat></D:response><D:response><D:href>/${paginatedFolder1.plainName}/</D:href><D:propstat><D:status>HTTP/1.1 200 OK</D:status><D:prop><D:displayname>${paginatedFolder1.plainName}</D:displayname><D:getlastmodified>${FormatUtils.formatDateForWebDav(paginatedFolder1.updatedAt)}</D:getlastmodified><D:getcontentlength>0</D:getcontentlength><D:resourcetype><D:collection/></D:resourcetype></D:prop></D:propstat></D:response></D:multistatus>`,
    );
  });

  it('When a WebDav client sends a PROPFIND request for a file, should return the correct XML', async () => {
    const configService = ConfigService.instance;
    const driveFolderService = DriveFolderService.instance;

    sandbox.stub(configService, 'readUser').resolves({
      user: UserSettingsFixture,
      root_folder_uuid: 'test_root_folder_uuid',
      token: 'TOKEN',
      newToken: 'NEW_TOKEN',
      mnemonic: 'MNEMONIC',
    });

    const driveRealmManager = getDriveRealmManager();
    sandbox.stub(driveRealmManager, 'findByRelativePath').returns(getDriveFileRealmSchemaFixture());

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

    sandbox.stub(configService, 'readUser').resolves({
      user: UserSettingsFixture,
      root_folder_uuid: 'test_root_folder_uuid',
      token: 'TOKEN',
      newToken: 'NEW_TOKEN',
      mnemonic: 'MNEMONIC',
    });

    const driveRealmManager = getDriveRealmManager();
    const paginatedFolder1 = newPaginatedFolder();
    sandbox.stub(driveFolderService, 'getFolderContent').resolves({
      files: [],
      folders: [paginatedFolder1],
    });
    const folderFixture = newFolderItem();
    sandbox.stub(driveFolderService, 'getFolderMetaByUuid').resolves(folderFixture);
    sandbox.stub(driveRealmManager, 'findByRelativePath').returns(getDriveFolderRealmSchemaFixture());
    const requestHandler = new PROPFINDRequestHandler(
      { debug: true },
      {
        driveFolderService,
        driveRealmManager,
      },
    );

    const request = createWebDavRequestFixture({
      url: '/folder_a/',
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

    sandbox.stub(configService, 'readUser').resolves({
      user: UserSettingsFixture,
      root_folder_uuid: 'test_root_folder_uuid',
      token: 'TOKEN',
      newToken: 'NEW_TOKEN',
      mnemonic: 'MNEMONIC',
    });

    const driveRealmManager = getDriveRealmManager();
    sandbox.stub(driveRealmManager, 'findByRelativePath').returns(null);
    const requestHandler = new PROPFINDRequestHandler(
      { debug: true },
      {
        driveFolderService,
        driveRealmManager,
      },
    );

    const request = createWebDavRequestFixture({
      url: '/folder_a/',
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
