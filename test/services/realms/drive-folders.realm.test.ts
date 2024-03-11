describe('Drive folders realm', () => {});

import sinon from 'sinon';
import { DriveFolderRealmSchema, DriveFoldersRealm } from '../../../src/services/realms/drive-folders.realm';
import { Realm } from 'realm';
import { expect } from 'chai';
import { DriveFolderItem } from '../../../src/types/drive.types';
describe('Drive folders realm', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });
  it('When findByRelativePath is called, should return the correct object', async () => {
    const realmMock = sandbox.createStubInstance(Realm);
    const driveFolderRealm = new DriveFoldersRealm(realmMock);
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
    realmMock.objects.withArgs('DriveFolder').returns({ filtered: sinon.stub().returns([mockFolder]) });

    const result = await driveFolderRealm.findByRelativePath(relativePath);

    expect(result).to.deep.equal(mockFolder);
    realmMock.close();
  });

  it('When create is called, should create the correct object', async () => {
    const realmMock = sandbox.createStubInstance(Realm);
    const driveFolderRealm = new DriveFoldersRealm(realmMock);
    const relativePath = '/folder1/file.png';

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

    realmMock.objectForPrimaryKey.withArgs('DriveFolder', driveFolder.id).returns(null);

    await driveFolderRealm.create(driveFolder, relativePath);

    expect(realmMock.objectForPrimaryKey.calledWith('DriveFolder', driveFolder.id)).to.be.true;

    realmMock.close();
  });
});
