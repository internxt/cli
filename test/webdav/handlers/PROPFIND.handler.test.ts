import sinon from 'sinon';
import { PROPFINDRequestHandler } from '../../../src/webdav/handlers/PROPFIND.handler';
import { DriveFolderService } from '../../../src/services/drive/drive-folder.service';
import { UserSettingsFixture } from '../../fixtures/auth.fixture';
import { newFileItem, newFolderItem, newPaginatedFolder } from '../../fixtures/drive.fixture';
import {
  createWebDavRequestFixture,
  createWebDavResponseFixture,
  getRequestedFileResource,
  getRequestedFolderResource,
} from '../../fixtures/webdav.fixture';
import { getDriveDatabaseManager } from '../../fixtures/drive-database.fixture';
import { FormatUtils } from '../../../src/utils/format.utils';
import { DriveFileService } from '../../../src/services/drive/drive-file.service';
import { WebDavRequestedResource } from '../../../src/types/webdav.types';
import { WebDavUtils } from '../../../src/utils/webdav.utils';
import { expect } from 'chai';
import mime from 'mime-types';
import crypto from 'crypto';
import { NotFoundError } from '../../../src/utils/errors.utils';
import { fail } from 'assert';

describe('PROPFIND request handler', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it('When a WebDav client sends a PROPFIND request for the root folder, and there is no content, should return the correct XML', async () => {
    const driveFolderService = DriveFolderService.instance;
    const driveFileService = DriveFileService.instance;
    const requestHandler = new PROPFINDRequestHandler(
      { debug: true },
      {
        driveFileService,
        driveFolderService,
        driveDatabaseManager: getDriveDatabaseManager(),
      },
    );
    const requestedFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/',
      folderName: '',
    });

    const request = createWebDavRequestFixture({
      method: 'PROPFIND',
      url: '/',
      user: UserSettingsFixture,
    });
    const sendStub = sandbox.stub();
    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sendStub }),
    });

    const folderFixture = newFolderItem({
      id: UserSettingsFixture.root_folder_id,
    });

    const getRequestedResourceStub = sandbox
      .stub(WebDavUtils, 'getRequestedResource')
      .resolves(requestedFolderResource);
    const getAndSearchItemFromResourceStub = sandbox
      .stub(WebDavUtils, 'getAndSearchItemFromResource')
      .resolves(folderFixture);
    const getFolderContentStub = sandbox
      .stub(driveFolderService, 'getFolderContent')
      .resolves({ folders: [], files: [] });

    await requestHandler.handle(request, response);
    expect(response.status.calledWith(207)).to.be.true;
    expect(
      sendStub.calledWith(
        `<?xml version="1.0" encoding="utf-8" ?><D:multistatus xmlns:D="DAV:"><D:response><D:href>${encodeURIComponent('/')}</D:href><D:propstat><D:status>HTTP/1.1 200 OK</D:status><D:prop><D:getcontenttype>application/octet-stream</D:getcontenttype><x1:lastmodified xmlns:x1="SAR:">${FormatUtils.formatDateForWebDav(folderFixture.updatedAt)}</x1:lastmodified><x2:executable xmlns:x2="http://apache.org/dav/props/">F</x2:executable><x3:Win32FileAttributes xmlns:x3="urn:schemas-microsoft-com:">00000030</x3:Win32FileAttributes><D:resourcetype><D:collection/></D:resourcetype></D:prop></D:propstat></D:response></D:multistatus>`,
      ),
    ).to.be.true;
    expect(getRequestedResourceStub.calledOnce).to.be.true;
    expect(getAndSearchItemFromResourceStub.calledOnce).to.be.true;
    expect(getFolderContentStub.calledOnce).to.be.true;
  });

  it('When a WebDav client sends a PROPFIND request for the root folder, and there is content, should return the correct XML', async () => {
    const driveFolderService = DriveFolderService.instance;
    const driveFileService = DriveFileService.instance;
    const requestHandler = new PROPFINDRequestHandler(
      { debug: true },
      {
        driveFileService,
        driveFolderService,
        driveDatabaseManager: getDriveDatabaseManager(),
      },
    );
    const requestedFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/',
      folderName: '',
    });

    const request = createWebDavRequestFixture({
      method: 'PROPFIND',
      url: '/',
      user: UserSettingsFixture,
    });
    const sendStub = sandbox.stub();
    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sendStub }),
    });

    const folderFixture = newFolderItem({
      id: UserSettingsFixture.root_folder_id,
    });
    const paginatedFolder1 = newPaginatedFolder({
      plainName: 'folder_1',
      updatedAt: new Date('2024-03-04T15:11:01.000Z'),
      uuid: 'FOLDER_UUID_1',
    });

    const getRequestedResourceStub = sandbox
      .stub(WebDavUtils, 'getRequestedResource')
      .resolves(requestedFolderResource);
    const getAndSearchItemFromResourceStub = sandbox
      .stub(WebDavUtils, 'getAndSearchItemFromResource')
      .resolves(folderFixture);
    const getFolderContentStub = sandbox.stub(driveFolderService, 'getFolderContent').resolves({
      files: [],
      folders: [paginatedFolder1],
    });

    await requestHandler.handle(request, response);
    expect(response.status.calledWith(207)).to.be.true;
    expect(
      sendStub.calledWith(
        `<?xml version="1.0" encoding="utf-8" ?><D:multistatus xmlns:D="DAV:"><D:response><D:href>${encodeURIComponent('/')}</D:href><D:propstat><D:status>HTTP/1.1 200 OK</D:status><D:prop><D:getcontenttype>application/octet-stream</D:getcontenttype><x1:lastmodified xmlns:x1="SAR:">${FormatUtils.formatDateForWebDav(folderFixture.updatedAt)}</x1:lastmodified><x2:executable xmlns:x2="http://apache.org/dav/props/">F</x2:executable><x3:Win32FileAttributes xmlns:x3="urn:schemas-microsoft-com:">00000030</x3:Win32FileAttributes><D:resourcetype><D:collection/></D:resourcetype></D:prop></D:propstat></D:response><D:response><D:href>${encodeURIComponent(`/${paginatedFolder1.plainName}/`)}</D:href><D:propstat><D:status>HTTP/1.1 200 OK</D:status><D:prop><D:displayname>${paginatedFolder1.plainName}</D:displayname><D:getlastmodified>${FormatUtils.formatDateForWebDav(paginatedFolder1.updatedAt)}</D:getlastmodified><D:getcontentlength>0</D:getcontentlength><D:resourcetype><D:collection/></D:resourcetype></D:prop></D:propstat></D:response></D:multistatus>`,
      ),
    ).to.be.true;
    expect(getRequestedResourceStub.calledOnce).to.be.true;
    expect(getAndSearchItemFromResourceStub.calledOnce).to.be.true;
    expect(getFolderContentStub.calledOnce).to.be.true;
  });

  it('When a WebDav client sends a PROPFIND request for a file, should return the correct XML', async () => {
    const driveFolderService = DriveFolderService.instance;
    const driveFileService = DriveFileService.instance;
    const requestHandler = new PROPFINDRequestHandler(
      { debug: true },
      {
        driveFileService,
        driveFolderService,
        driveDatabaseManager: getDriveDatabaseManager(),
      },
    );
    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource({
      parentFolder: '/',
      fileName: 'file',
      fileType: 'png',
    });

    const request = createWebDavRequestFixture({
      method: 'PROPFIND',
      url: '/file.png',
      user: UserSettingsFixture,
    });
    const sendStub = sandbox.stub();
    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sendStub }),
    });

    const fileFixture = newFileItem({ name: 'file', type: 'png' });
    const uuidFixture = 'test-test-test-test-test';
    const etagFixture = uuidFixture.replaceAll('-', '');
    const mimeFixture = 'image/png';

    const getRequestedResourceStub = sandbox.stub(WebDavUtils, 'getRequestedResource').resolves(requestedFileResource);
    const getAndSearchItemFromResourceStub = sandbox
      .stub(WebDavUtils, 'getAndSearchItemFromResource')
      .resolves(fileFixture);
    const randomUUIDStub = sandbox.stub(crypto, 'randomUUID').returns(uuidFixture);
    const mimeLookupStub = sandbox.stub(mime, 'lookup').returns(mimeFixture);

    await requestHandler.handle(request, response);
    expect(response.status.calledWith(207)).to.be.true;
    expect(
      sendStub.calledWith(
        `<?xml version="1.0" encoding="utf-8" ?><D:multistatus xmlns:D="DAV:"><D:response><D:href>${encodeURIComponent(requestedFileResource.url)}</D:href><D:propstat><D:status>HTTP/1.1 200 OK</D:status><D:prop><D:resourcetype></D:resourcetype><D:getetag>&quot;${etagFixture}&quot;</D:getetag><D:displayname>${fileFixture.name + '.' + fileFixture.type}</D:displayname><D:getcontenttype>${mimeFixture}</D:getcontenttype><D:getlastmodified>${FormatUtils.formatDateForWebDav(fileFixture.updatedAt)}</D:getlastmodified><D:getcontentlength>${fileFixture.size}</D:getcontentlength></D:prop></D:propstat></D:response></D:multistatus>`,
      ),
    ).to.be.true;
    expect(getRequestedResourceStub.calledOnce).to.be.true;
    expect(getAndSearchItemFromResourceStub.calledOnce).to.be.true;
    expect(randomUUIDStub.calledOnce).to.be.true;
    expect(mimeLookupStub.calledOnce).to.be.true;
  });

  it('When a WebDav client sends a PROPFIND request for a folder, should return the correct XML', async () => {
    const driveFolderService = DriveFolderService.instance;
    const driveFileService = DriveFileService.instance;
    const requestHandler = new PROPFINDRequestHandler(
      { debug: true },
      {
        driveFileService,
        driveFolderService,
        driveDatabaseManager: getDriveDatabaseManager(),
      },
    );
    const requestedFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/',
      folderName: 'folder_a',
    });

    const request = createWebDavRequestFixture({
      method: 'PROPFIND',
      url: '/folder_a/',
      user: UserSettingsFixture,
    });
    const sendStub = sandbox.stub();
    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sendStub }),
    });

    const folderFixture = newFolderItem({ name: requestedFolderResource.name });
    const paginatedFolder1 = newPaginatedFolder();

    const getRequestedResourceStub = sandbox
      .stub(WebDavUtils, 'getRequestedResource')
      .resolves(requestedFolderResource);
    const getAndSearchItemFromResourceStub = sandbox
      .stub(WebDavUtils, 'getAndSearchItemFromResource')
      .resolves(folderFixture);
    const getFolderContentStub = sandbox.stub(driveFolderService, 'getFolderContent').resolves({
      files: [],
      folders: [paginatedFolder1],
    });

    await requestHandler.handle(request, response);
    expect(response.status.calledWith(207)).to.be.true;
    // TODO: Test the XML response
    expect(getRequestedResourceStub.calledOnce).to.be.true;
    expect(getAndSearchItemFromResourceStub.calledOnce).to.be.true;
    expect(getFolderContentStub.calledOnce).to.be.true;
  });

  it('When a WebDav client sends a PROPFIND request for a folder and it does not exists, should return a 404', async () => {
    const driveFolderService = DriveFolderService.instance;
    const driveFileService = DriveFileService.instance;
    const requestHandler = new PROPFINDRequestHandler(
      { debug: true },
      {
        driveFileService,
        driveFolderService,
        driveDatabaseManager: getDriveDatabaseManager(),
      },
    );
    const requestedFolderResource: WebDavRequestedResource = getRequestedFolderResource({
      parentFolder: '/',
      folderName: 'folder_a',
    });

    const request = createWebDavRequestFixture({
      method: 'PROPFIND',
      url: '/folder_a/',
      user: UserSettingsFixture,
    });

    const sendStub = sandbox.stub();
    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sendStub }),
    });

    const expectedError = new NotFoundError(`Resource not found on Internxt Drive at ${requestedFolderResource.url}`);

    const getRequestedResourceStub = sandbox
      .stub(WebDavUtils, 'getRequestedResource')
      .resolves(requestedFolderResource);
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
});
