import { expect } from 'chai';
import sinon from 'sinon';
import { WebDavUtils } from '../../src/utils/webdav.utils';
import { createWebDavRequestFixture } from '../fixtures/webdav.fixture';
import {
  getDriveDatabaseManager,
  getDriveFileDatabaseFixture,
  getDriveFolderDatabaseFixture,
} from '../fixtures/drive-database.fixture';
import { WebDavRequestedResource } from '../../src/types/webdav.types';
import { newFileItem, newFolderItem } from '../fixtures/drive.fixture';
import { DriveFolderService } from '../../src/services/drive/drive-folder.service';
import { DriveFileService } from '../../src/services/drive/drive-file.service';
import { fail } from 'assert';
import { NotFoundError } from '../../src/utils/errors.utils';

describe('Webdav utils', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  describe('joinURL', () => {
    it('When a list of path components are given, then it should generate a correct href', () => {
      const href = WebDavUtils.joinURL('/path', 'to', 'file');
      expect(href).to.equal('/path/to/file');
    });

    it('When a list of path components are given, should generate a correct href and remove incorrect characters', () => {
      const href = WebDavUtils.joinURL('/path', 'to', 'folder/');
      expect(href).to.equal('/path/to/folder/');
    });
  });

  describe('removeHostFromURL', () => {
    it('When a list of path components are given, then it should generate a correct href', () => {
      expect(WebDavUtils.removeHostFromURL('https://test.com/folder1')).to.equal('/folder1');
      expect(WebDavUtils.removeHostFromURL('http://test.com/folder1')).to.equal('/folder1');
      expect(WebDavUtils.removeHostFromURL('test.com/folder1')).to.equal('/folder1');
      expect(WebDavUtils.removeHostFromURL('https://test.com/folder1/folder2/folder3/')).to.equal(
        '/folder1/folder2/folder3/',
      );
      expect(WebDavUtils.removeHostFromURL('https://test.com/folder1/test.jpg')).to.equal('/folder1/test.jpg');
    });
  });

  describe('getRequestedResource', () => {
    it('When folder request is given, then it should return the requested resource', async () => {
      const request = createWebDavRequestFixture({
        url: '/url/to/folder/',
      });
      const resource = await WebDavUtils.getRequestedResource(request);
      expect(resource).to.deep.equal({
        url: '/url/to/folder/',
        type: 'folder',
        name: 'folder',
        parentPath: '/url/to/',
        path: {
          base: 'folder',
          dir: '/url/to',
          ext: '',
          name: 'folder',
          root: '/',
        },
      });
    });

    it('When folder url is given, then it should generate the requested resource', async () => {
      const requestURL = '/url/to/folder/';
      const resource = await WebDavUtils.getRequestedResource(requestURL);
      expect(resource).to.deep.equal({
        url: '/url/to/folder/',
        type: 'folder',
        name: 'folder',
        parentPath: '/url/to/',
        path: {
          base: 'folder',
          dir: '/url/to',
          ext: '',
          name: 'folder',
          root: '/',
        },
      });
    });

    it('When file request is given, then it should generate the requested resource', async () => {
      const request = createWebDavRequestFixture({
        url: '/url/to/test.png',
      });
      const resource = await WebDavUtils.getRequestedResource(request);
      expect(resource).to.deep.equal({
        url: '/url/to/test.png',
        type: 'file',
        name: 'test',
        parentPath: '/url/to/',
        path: {
          base: 'test.png',
          dir: '/url/to',
          ext: '.png',
          name: 'test',
          root: '/',
        },
      });
    });

    it('When file url is given, then it should generate the requested resource', async () => {
      const requestURL = '/url/to/test.png';
      const resource = await WebDavUtils.getRequestedResource(requestURL);
      expect(resource).to.deep.equal({
        url: '/url/to/test.png',
        type: 'file',
        name: 'test',
        parentPath: '/url/to/',
        path: {
          base: 'test.png',
          dir: '/url/to',
          ext: '.png',
          name: 'test',
          root: '/',
        },
      });
    });
  });

  describe('getDatabaseItemFromResource', () => {
    const requestFileFixture: WebDavRequestedResource = {
      url: '/url/to/test.png',
      type: 'file',
      name: 'test',
      parentPath: '/url/to/',
      path: {
        base: 'test.png',
        dir: '/url/to',
        ext: '.png',
        name: 'test',
        root: '/',
      },
    };
    const requestFolderFixture: WebDavRequestedResource = {
      url: '/url/to/folder/',
      type: 'folder',
      name: 'folder',
      parentPath: '/url/to/',
      path: {
        base: 'folder',
        dir: '/url/to',
        ext: '',
        name: 'folder',
        root: '/',
      },
    };

    it('When folder request is given, then it should return the requested resource', async () => {
      const driveDatabaseManager = getDriveDatabaseManager();
      const folder = getDriveFolderDatabaseFixture();
      const findFolderStub = sandbox.stub(driveDatabaseManager, 'findFolderByRelativePath').resolves(folder);
      const findFileStub = sandbox.stub(driveDatabaseManager, 'findFileByRelativePath').rejects();

      const item = await WebDavUtils.getDatabaseItemFromResource(requestFolderFixture, driveDatabaseManager);
      expect(item).to.eql(folder.toItem());
      expect(findFolderStub.calledOnce).to.be.true;
      expect(findFileStub.called).to.be.false;
    });

    it('When file request is given, then it should return the requested resource', async () => {
      const driveDatabaseManager = getDriveDatabaseManager();
      const file = getDriveFileDatabaseFixture();
      const findFileStub = sandbox.stub(driveDatabaseManager, 'findFileByRelativePath').resolves(file);
      const findFolderStub = sandbox.stub(driveDatabaseManager, 'findFolderByRelativePath').rejects();

      const item = await WebDavUtils.getDatabaseItemFromResource(requestFileFixture, driveDatabaseManager);
      expect(item).to.eql(file.toItem());
      expect(findFileStub.calledOnce).to.be.true;
      expect(findFolderStub.called).to.be.false;
    });

    it('When file item is not found, then it should return null', async () => {
      const driveDatabaseManager = getDriveDatabaseManager();
      const findFileStub = sandbox.stub(driveDatabaseManager, 'findFileByRelativePath').resolves(null);
      const findFolderStub = sandbox.stub(driveDatabaseManager, 'findFolderByRelativePath').rejects();

      const item = await WebDavUtils.getDatabaseItemFromResource(requestFileFixture, driveDatabaseManager);
      expect(item).to.be.null;
      expect(findFileStub.calledOnce).to.be.true;
      expect(findFolderStub.called).to.be.false;
    });
  });

  describe('setDatabaseItem', () => {
    it('When folder item is saved, then it is persisted to the database', async () => {
      const driveDatabaseManager = getDriveDatabaseManager();
      const expectedFolder = getDriveFolderDatabaseFixture();
      const createFolderStub = sandbox.stub(driveDatabaseManager, 'createFolder').resolves(expectedFolder);
      const createFileStub = sandbox.stub(driveDatabaseManager, 'createFile').rejects();

      const driveFolder = await WebDavUtils.setDatabaseItem(
        'folder',
        newFolderItem(),
        driveDatabaseManager,
        'relative-path',
      );
      expect(driveFolder).to.eql(expectedFolder);
      expect(createFolderStub.calledOnce).to.be.true;
      expect(createFileStub.called).to.be.false;
    });

    it('When file item is saved, then it is persisted to the database', async () => {
      const driveDatabaseManager = getDriveDatabaseManager();
      const expectedFile = getDriveFileDatabaseFixture();
      const createFileStub = sandbox.stub(driveDatabaseManager, 'createFile').resolves(expectedFile);
      const createFolderStub = sandbox.stub(driveDatabaseManager, 'createFolder').rejects();

      const driveFile = await WebDavUtils.setDatabaseItem('file', newFileItem(), driveDatabaseManager, 'relative-path');
      expect(driveFile).to.eql(expectedFile);
      expect(createFileStub.calledOnce).to.be.true;
      expect(createFolderStub.called).to.be.false;
    });
  });

  describe('getDriveItemFromResource', () => {
    const requestFileFixture: WebDavRequestedResource = {
      url: '/url/to/test.png',
      type: 'file',
      name: 'test',
      parentPath: '/url/to/',
      path: {
        base: 'test.png',
        dir: '/url/to',
        ext: '.png',
        name: 'test',
        root: '/',
      },
    };
    const requestFolderFixture: WebDavRequestedResource = {
      url: '/url/to/folder/',
      type: 'folder',
      name: 'folder',
      parentPath: '/url/to/',
      path: {
        base: 'folder',
        dir: '/url/to',
        ext: '',
        name: 'folder',
        root: '/',
      },
    };

    it('When folder resource is looked by its path, then it is returned', async () => {
      const expectedFolder = newFolderItem();
      const findFolderStub = sandbox
        .stub(DriveFolderService.instance, 'getFolderMetadataByPath')
        .resolves(expectedFolder);
      const findFileStub = sandbox.stub(DriveFileService.instance, 'getFileMetadataByPath').rejects();

      const driveFolderItem = await WebDavUtils.getDriveItemFromResource(
        requestFolderFixture,
        DriveFolderService.instance,
        undefined,
      );
      expect(driveFolderItem).to.eql(expectedFolder);
      expect(findFolderStub.calledOnce).to.be.true;
      expect(findFileStub.called).to.be.false;
    });

    it('When file resource is looked by its path, then it is returned', async () => {
      const expectedFile = newFileItem();
      const findFileStub = sandbox.stub(DriveFileService.instance, 'getFileMetadataByPath').resolves(expectedFile);
      const findFolderStub = sandbox.stub(DriveFolderService.instance, 'getFolderMetadataByPath').rejects();

      const driveFileItem = await WebDavUtils.getDriveItemFromResource(
        requestFileFixture,
        undefined,
        DriveFileService.instance,
      );
      expect(driveFileItem).to.eql(expectedFile);
      expect(findFileStub.calledOnce).to.be.true;
      expect(findFolderStub.called).to.be.false;
    });
  });

  describe('getAndSearchItemFromResource', () => {
    const requestFileFixture: WebDavRequestedResource = {
      url: '/url/to/test.png',
      type: 'file',
      name: 'test',
      parentPath: '/url/to/',
      path: {
        base: 'test.png',
        dir: '/url/to',
        ext: '.png',
        name: 'test',
        root: '/',
      },
    };
    const requestFolderFixture: WebDavRequestedResource = {
      url: '/url/to/folder/',
      type: 'folder',
      name: 'folder',
      parentPath: '/url/to/',
      path: {
        base: 'folder',
        dir: '/url/to',
        ext: '',
        name: 'folder',
        root: '/',
      },
    };

    it('When folder item is looked by the resource and exists in the local db, then it is returned from db', async () => {
      const driveDatabaseManager = getDriveDatabaseManager();
      const expectedFolder = newFolderItem();
      const findFolderStub = sandbox.stub(WebDavUtils, 'getDatabaseItemFromResource').resolves(expectedFolder);
      const findFolderOnDriveStub = sandbox.stub(WebDavUtils, 'getDriveItemFromResource').rejects();
      const saveFolderOnLocalStub = sandbox.stub(WebDavUtils, 'setDatabaseItem').rejects();

      const driveFolderItem = await WebDavUtils.getAndSearchItemFromResource({
        resource: requestFolderFixture,
        driveDatabaseManager,
      });
      expect(driveFolderItem).to.eql(expectedFolder);
      expect(findFolderStub.calledOnce).to.be.true;
      expect(findFolderOnDriveStub.called).to.be.false;
      expect(saveFolderOnLocalStub.called).to.be.false;
    });

    it('When file item is looked by the resource and exists in the local db, then it is returned from db', async () => {
      const driveDatabaseManager = getDriveDatabaseManager();
      const expectedFile = newFileItem();
      const findFileStub = sandbox.stub(WebDavUtils, 'getDatabaseItemFromResource').resolves(expectedFile);
      const findFileOnDriveStub = sandbox.stub(WebDavUtils, 'getDriveItemFromResource').rejects();
      const saveFileOnLocalStub = sandbox.stub(WebDavUtils, 'setDatabaseItem').rejects();

      const driveFolderItem = await WebDavUtils.getAndSearchItemFromResource({
        resource: requestFileFixture,
        driveDatabaseManager,
      });
      expect(driveFolderItem).to.eql(expectedFile);
      expect(findFileStub.calledOnce).to.be.true;
      expect(findFileOnDriveStub.called).to.be.false;
      expect(saveFileOnLocalStub.called).to.be.false;
    });

    it('When folder item is looked by the resource and not exists in the local db, then it is returned from drive', async () => {
      const driveDatabaseManager = getDriveDatabaseManager();
      const expectedFolder = newFolderItem();
      const findFolderStub = sandbox.stub(WebDavUtils, 'getDatabaseItemFromResource').resolves(null);
      const findFolderOnDriveStub = sandbox.stub(WebDavUtils, 'getDriveItemFromResource').resolves(expectedFolder);
      const saveFolderOnLocalStub = sandbox.stub(WebDavUtils, 'setDatabaseItem').resolves();

      const driveFolderItem = await WebDavUtils.getAndSearchItemFromResource({
        resource: requestFolderFixture,
        driveDatabaseManager,
      });
      expect(driveFolderItem).to.eql(expectedFolder);
      expect(findFolderStub.calledOnce).to.be.true;
      expect(findFolderOnDriveStub.calledOnce).to.be.true;
      expect(saveFolderOnLocalStub.calledOnce).to.be.true;
    });

    it('When file item is looked by the resource and not exists in the local db, then it is returned from drive', async () => {
      const driveDatabaseManager = getDriveDatabaseManager();
      const expectedFile = newFileItem();
      const findFileStub = sandbox.stub(WebDavUtils, 'getDatabaseItemFromResource').resolves(null);
      const findFileOnDriveStub = sandbox.stub(WebDavUtils, 'getDriveItemFromResource').resolves(expectedFile);
      const saveFileOnLocalStub = sandbox.stub(WebDavUtils, 'setDatabaseItem').resolves();

      const driveFolderItem = await WebDavUtils.getAndSearchItemFromResource({
        resource: requestFileFixture,
        driveDatabaseManager,
      });
      expect(driveFolderItem).to.eql(expectedFile);
      expect(findFileStub.calledOnce).to.be.true;
      expect(findFileOnDriveStub.called).to.be.true;
      expect(saveFileOnLocalStub.called).to.be.true;
    });

    it('When file item is looked by the resource and not exists in the local db nor drive, then a not found error is thrown', async () => {
      const driveDatabaseManager = getDriveDatabaseManager();
      const findItemStub = sandbox.stub(WebDavUtils, 'getDatabaseItemFromResource').resolves(null);
      const findItemOnDriveStub = sandbox.stub(WebDavUtils, 'getDriveItemFromResource').resolves(undefined);
      const saveItemOnLocalStub = sandbox.stub(WebDavUtils, 'setDatabaseItem').rejects();

      try {
        await WebDavUtils.getAndSearchItemFromResource({ resource: requestFileFixture, driveDatabaseManager });
        fail('Expected function to throw an error, but it did not.');
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
      expect(findItemStub.calledOnce).to.be.true;
      expect(findItemOnDriveStub.called).to.be.true;
      expect(saveItemOnLocalStub.called).to.be.false;
    });
  });
});
