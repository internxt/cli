import sinon from 'sinon';
import { DriveFileRealmSchema, DriveFilesRealm } from '../../../src/services/realms/drive-files.realm';
import { Realm } from 'realm';
import { expect } from 'chai';
import { DriveFileItem } from '../../../src/types/drive.types';
describe('Drive files realm', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });

  it('When getByRelativePath is called, should return the correct object', () => {
    const realmMock = sandbox.createStubInstance(Realm);
    const driveFilesRealm = new DriveFilesRealm(realmMock);
    const relativePath = 'existing/path';
    // @ts-expect-error - Partial mock
    const mockFile: DriveFileRealmSchema = {
      id: 1,
      name: 'Test File',
      type: 'text',
      uuid: 'file-uuid',
      file_id: 'file-id',
      folder_id: 1,
      bucket: 'test-bucket',
      relative_path: relativePath,
      created_at: new Date(),
      updated_at: new Date(),
      size: 1024,
      status: 'EXISTS',
    };

    // @ts-expect-error - Partial mock
    realmMock.objects.withArgs('DriveFile').returns({ filtered: sinon.stub().returns([mockFile]) });

    const result = driveFilesRealm.findByRelativePath(relativePath);

    expect(result).to.deep.equal(mockFile);
    realmMock.close();
  });

  it('When create is called, should create the correct object', () => {
    const realmStub = sandbox.createStubInstance(Realm);
    const driveFileRealm = new DriveFilesRealm(realmStub);
    const relativePath = '/folder1/file.png';

    const driveFile: DriveFileItem = {
      id: 1,
      name: 'file',
      uuid: 'uuid_1',
      size: 1024,
      status: 'EXISTS',
      fileId: 'file_id',
      folderId: 123,
      createdAt: new Date(),
      updatedAt: new Date(),
      bucket: 'test-bucket',
      encryptedName: 'encrypted-name',
    };

    // @ts-expect-error - Partial mock
    realmStub.objects.withArgs('DriveFile').returns({ filtered: sinon.stub().returns([]) });

    driveFileRealm.createOrReplace(driveFile, relativePath);

    expect(realmStub.objects.calledWith('DriveFile')).to.be.true;

    realmStub.close();
  });
});
