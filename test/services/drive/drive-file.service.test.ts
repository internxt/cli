import sinon from 'sinon';
import { DriveFileService } from '../../../src/services/drive/drive-file.service';
import { SdkManager } from '../../../src/services/sdk-manager.service';
import { expect } from 'chai';
describe('Drive file Service', () => {
  let sut: DriveFileService;

  beforeEach(() => {
    sut = DriveFileService.instance;
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

    const storageClientMock = {
      createFileEntry: sinon.stub().returns({
        uuid: 'example-uuid',
        createdAt: new Date(),
        updatedAt: new Date(),
        id: 'example-id',
      }),
    };

    // @ts-expect-error - We only stub the method we need to test
    sinon.stub(SdkManager.instance, 'getStorage').returns(storageClientMock);

    const result = await sut.createFile(payload);

    expect(result.bucket).to.equal(payload.bucket);
    expect(result.name).to.equal(payload.name);
  });
});
