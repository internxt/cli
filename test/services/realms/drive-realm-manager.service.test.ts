import sinon from 'sinon';
import { DriveFilesRealm } from '../../../src/services/realms/drive-files.realm';
import { DriveFoldersRealm } from '../../../src/services/realms/drive-folders.realm';
import { DriveRealmManager } from '../../../src/services/realms/drive-realm-manager.service';
import { getDriveFolderRealmSchemaFixture } from '../../fixtures/drive-realm.fixture';
import { expect } from 'chai';
describe('DriveRealmManager service', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  it('When a folder is created, should build the correct relative path', async () => {
    // @ts-expect-error - We only mock the properties we need
    const driveFilesRealm: DriveFilesRealm = {
      getByRelativePath: sandbox.stub(),
    };

    // @ts-expect-error - We only mock the properties we need
    const driveFoldersRealm: DriveFoldersRealm = {
      findByRelativePath: sandbox.stub(),
      findByParentId: async () => null,
    };

    sandbox.stub(driveFoldersRealm, 'findByParentId').callsFake(async (parentId: number | null) => {
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

    const path = await sut.buildRelativePathForFolder('folderD', 1);

    expect(path).to.be.equal('/folderA/folderB/folderC/folderD/');
  });
});
