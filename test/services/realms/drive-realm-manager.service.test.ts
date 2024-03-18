import sinon from 'sinon';
import { DriveFilesRealm } from '../../../src/services/realms/drive-files.realm';
import { DriveFoldersRealm } from '../../../src/services/realms/drive-folders.realm';
import { DriveRealmManager } from '../../../src/services/realms/drive-realm-manager.service';
import { getDriveFileRealmSchemaFixture, getDriveFolderRealmSchemaFixture } from '../../fixtures/drive-realm.fixture';
import { expect } from 'chai';
import path from 'path';

describe('DriveRealmManager service', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });

  it('When a relative path is provided for a file, should return the correct item', () => {
    // @ts-expect-error - We only mock the properties we need
    const driveFilesRealm: DriveFilesRealm = {
      findByRelativePath: () => {
        return null;
      },
    };

    // @ts-expect-error - We only mock the properties we need
    const driveFoldersRealm: DriveFoldersRealm = {
      findByRelativePath: sandbox.stub(),
      findByParentId: () => null,
    };

    const sut = new DriveRealmManager(driveFilesRealm, driveFoldersRealm);

    sandbox
      .stub(driveFilesRealm, 'findByRelativePath')
      .returns(getDriveFileRealmSchemaFixture({ id: 1, name: 'file.png' }));
    const item = sut.findByRelativePath('/test/file.png');

    expect(item?.id).to.be.equal(1);
  });

  it('When a relative path is provided for a folder, should return the correct item', () => {
    // @ts-expect-error - We only mock the properties we need
    const driveFilesRealm: DriveFilesRealm = {
      findByRelativePath: () => {
        return null;
      },
    };

    // @ts-expect-error - We only mock the properties we need
    const driveFoldersRealm: DriveFoldersRealm = {
      findByRelativePath: () => null,
      findByParentId: () => null,
    };

    const sut = new DriveRealmManager(driveFilesRealm, driveFoldersRealm);

    sandbox.stub(driveFilesRealm, 'findByRelativePath').returns(null);
    sandbox
      .stub(driveFoldersRealm, 'findByRelativePath')
      .returns(getDriveFolderRealmSchemaFixture({ id: 34, name: 'folder' }));
    const item = sut.findByRelativePath('/test/folder/');

    expect(item?.id).to.be.equal(34);
  });

  it('When a folder is created, should build the correct relative path', () => {
    // @ts-expect-error - We only mock the properties we need
    const driveFilesRealm: DriveFilesRealm = {
      findByRelativePath: sandbox.stub(),
    };

    // @ts-expect-error - We only mock the properties we need
    const driveFoldersRealm: DriveFoldersRealm = {
      findByRelativePath: sandbox.stub(),
      findByParentId: () => null,
    };

    sandbox.stub(driveFoldersRealm, 'findByParentId').callsFake((parentId: number | null) => {
      if (parentId === 1) {
        return getDriveFolderRealmSchemaFixture({ id: parentId, name: 'folderC', parent_id: 2 });
      }

      if (parentId === 2) {
        return getDriveFolderRealmSchemaFixture({ id: parentId, name: 'folderB', parent_id: 3 });
      }

      if (parentId === 3) {
        return getDriveFolderRealmSchemaFixture({ id: parentId, name: 'folderA', parent_id: undefined });
      }
      return null;
    });

    const sut = new DriveRealmManager(driveFilesRealm, driveFoldersRealm);

    const relativePath = sut.buildRelativePathForFolder('folderD', 1);

    expect(relativePath).to.be.equal(path.posix.join('/', 'folderA', 'folderB', 'folderC', 'folderD', '/'));
  });

  it('When a file is created, should build the correct relative path', () => {
    // @ts-expect-error - We only mock the properties we need
    const driveFilesRealm: DriveFilesRealm = {
      findByRelativePath: sandbox.stub(),
    };

    // @ts-expect-error - We only mock the properties we need
    const driveFoldersRealm: DriveFoldersRealm = {
      findByRelativePath: sandbox.stub(),
      findByParentId: () => null,
    };

    sandbox.stub(driveFoldersRealm, 'findByParentId').callsFake((parentId: number | null) => {
      if (parentId === 1) {
        return getDriveFolderRealmSchemaFixture({ id: parentId, name: 'folderC', parent_id: 2 });
      }

      if (parentId === 2) {
        return getDriveFolderRealmSchemaFixture({ id: parentId, name: 'folderB', parent_id: 3 });
      }

      if (parentId === 3) {
        return getDriveFolderRealmSchemaFixture({ id: parentId, name: 'folderA', parent_id: undefined });
      }
      return null;
    });

    const sut = new DriveRealmManager(driveFilesRealm, driveFoldersRealm);

    const relativePath = sut.buildRelativePathForFile('file.png', 1);

    expect(relativePath).to.be.equal(path.posix.join('/', 'folderA', 'folderB', 'folderC', 'file.png'));
  });
});
