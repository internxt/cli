describe('Drive folders realm', () => {});

import sinon from 'sinon';
import { DriveFolderRealmSchema, DriveFoldersRealm } from '../../../src/services/realms/drive-folders.realm';
import { Realm } from 'realm';
import { expect } from 'chai';
import { DriveFolderItem } from '../../../src/types/drive.types';
import { getDriveFolderRealmSchemaFixture } from '../../fixtures/drive-realm.fixture';
describe('Drive folders realm', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });
  it('When findByRelativePath is called, should return the correct object', async () => {
    const realmStub = sandbox.createStubInstance(Realm);
    const driveFolderRealm = new DriveFoldersRealm(realmStub);
    const relativePath = 'folder1/folder_a/';

    // @ts-expect-error - Partial mock
    const mockFolder: DriveFolderRealmSchema = {
      id: 1,
      name: 'folder_a',
      uuid: 'uuid_1',
      relative_path: 'folder1/folder_a/',
      created_at: new Date(),
      updated_at: new Date(),
      status: 'EXISTS',
    };

    // @ts-expect-error - Partial mock
    realmStub.objects.withArgs('DriveFolder').returns({ filtered: sinon.stub().returns([mockFolder]) });

    const result = await driveFolderRealm.findByRelativePath(relativePath);

    expect(result).to.deep.equal(mockFolder);
    realmStub.close();
  });

  it('When create is called, should create the correct object', async () => {
    const realmStub = sandbox.createStubInstance(Realm);
    const driveFolderRealm = new DriveFoldersRealm(realmStub);
    const relativePath = '/folder1/';

    const driveFolder: DriveFolderItem = {
      id: 1,
      name: 'file',
      uuid: 'uuid_1',
      parentId: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      bucket: 'test-bucket',
      encryptedName: 'encrypted-name',
    };

    realmStub.objectForPrimaryKey.withArgs('DriveFolder', driveFolder.id).returns(null);

    await driveFolderRealm.createOrReplace(driveFolder, relativePath);

    expect(realmStub.objectForPrimaryKey.calledWith('DriveFolder', driveFolder.id)).to.be.true;

    realmStub.close();
  });

  it('When findByParentId is called, should return the object with the same parentid', async () => {
    const realmStub = sandbox.createStubInstance(Realm);

    const parentId = 1;
    const parentFolder: DriveFolderRealmSchema = getDriveFolderRealmSchemaFixture({
      parent_id: parentId,
    });

    const driveFolderRealm = new DriveFoldersRealm(realmStub);

    realmStub.objectForPrimaryKey.withArgs('DriveFolder', parentId ?? -1).returns(parentFolder);

    const result = await driveFolderRealm.findByParentId(parentId);

    expect(realmStub.objectForPrimaryKey.calledWith('DriveFolder', parentId ?? -1)).to.be.true;

    expect(result).to.equal(parentFolder);
  });
});
