import sinon from 'sinon';
import { PROPFINDRequestHandler } from '../../../src/webdav/handlers/PROPFIND.handler';

import { mockReq, mockRes } from 'sinon-express-mock';
import { ConfigService } from '../../../src/services/config.service';
import { DriveFolderService } from '../../../src/services/drive/drive-folder.service';
import { UserSettingsFixture } from '../../fixtures/auth.fixture';
import { newFolder, newPaginatedFolder } from '../../fixtures/drive.fixture';

describe('PROPFIND request handler', () => {
  const sandbox = sinon.createSandbox();
  beforeEach(() => {
    sandbox.restore();
  });

  it('When a WebDav client sends a PROPFIND request, and there is no content, should return the correct XML', async () => {
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
        configService,
        driveFolderService,
      },
    );
    const request = mockReq({
      method: 'PROPFIND',
    });

    const sendStub = sandbox.stub();
    const response = mockRes({
      status: sandbox.stub().returns({ send: sendStub }),
    });

    await requestHandler.handle(request, response);
    sinon.assert.calledWith(response.status, 200);
    sinon.assert.calledWith(
      sendStub,
      '<?xml version="1.0" encoding="utf-8" ?><D:multistatus xmlns:D="DAV:"></D:multistatus>',
    );
  });

  it('When a WebDav client sends a PROPFIND request, and there is content, should return the correct XML', async () => {
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
        configService,
        driveFolderService,
      },
    );
    const request = mockReq({
      method: 'PROPFIND',
    });

    const sendStub = sandbox.stub();
    const response = mockRes({
      status: sandbox.stub().returns({ send: sendStub }),
    });

    await requestHandler.handle(request, response);
    sinon.assert.calledWith(response.status, 200);
    sinon.assert.calledWith(
      sendStub,
      '<?xml version="1.0" encoding="utf-8" ?><D:multistatus xmlns:D="DAV:"><D:response><D:href>/webdav/folder_1</D:href><D:propstat><D:status>HTTP/1.1 200 OK</D:status><D:prop><D:displayname>folder_1</D:displayname><D:getlastmodified>Mon, 04 Mar 2024 15:11:01 GMT</D:getlastmodified><D:getcontentlength>0</D:getcontentlength><D:resourcetype><D:collection></D:collection></D:resourcetype></D:prop></D:propstat></D:response></D:multistatus>',
    );
  });
});
