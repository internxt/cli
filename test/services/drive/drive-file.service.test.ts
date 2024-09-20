import sinon from 'sinon';
import { DriveFileService } from '../../../src/services/drive/drive-file.service';
import { SdkManager } from '../../../src/services/sdk-manager.service';
import { expect } from 'chai';
import Storage, { DriveFileData } from '@internxt/sdk/dist/drive/storage/types';
import { Drive } from '@internxt/sdk';
import { randomUUID } from 'crypto';
import { CommonFixture } from '../../fixtures/common.fixture';
describe('Drive file Service', () => {
  let sut: DriveFileService;
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sut = DriveFileService.instance;
  });
  afterEach(() => {
    sandbox.restore();
  });
  it('When a file is created, should be created correctly', async () => {
    const payload = {
      name: 'example.txt',
      type: 'txt',
      size: 1024,
      folderId: 1,
      fileId: '123456',
      bucket: 'bucket123',
    };

    const storageClientMock: Partial<Drive.Storage> = {
      createFileEntry: sinon.stub().resolves({
        uuid: 'example-uuid',
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'example-id',
      }),
    };

    // @ts-expect-error - We only stub the method we need to test
    sandbox.stub(SdkManager.instance, 'getStorage').returns(storageClientMock);

    const result = await sut.createFile(payload);

    expect(result.bucket).to.equal(payload.bucket);
    expect(result.name).to.equal(payload.name);
  });

  it('When we want to obtain a file metadata, should return it correctly', async () => {
    const fakeFileData: DriveFileData = {
      uuid: randomUUID(),
      bucket: CommonFixture.createObjectId(),
      createdAt: new Date().toISOString(),
      created_at: new Date().toISOString(),
      deleted: false,
      deletedAt: null,
      encrypt_version: '',
      fileId: '',
      folderId: 0,
      folder_id: 0,
      id: 0,
      name: 'NAME',
      plain_name: 'PLAIN_NAME',
      size: 0,
      type: 'jpg',
      updatedAt: new Date().toISOString(),
      status: 'EXISTS',
      thumbnails: [],
      currentThumbnail: null,
      folderUuid: randomUUID(),
    };
    const storageClientMock: Partial<Storage> = {
      getFile: sinon.stub().returns([Promise.resolve(fakeFileData)]),
    };

    // @ts-expect-error - We only stub the method we need to test
    sandbox.stub(SdkManager.instance, 'getStorage').returns(storageClientMock);

    const result = await sut.getFileMetadata(fakeFileData.uuid);

    expect(result.bucket).to.equal(fakeFileData.bucket);
    expect(result.uuid).to.equal(fakeFileData.uuid);
  });
});
