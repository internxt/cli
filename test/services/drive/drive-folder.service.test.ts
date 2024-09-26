import sinon from 'sinon';
import { expect } from 'chai';
import { randomUUID } from 'crypto';
import { Storage } from '@internxt/sdk/dist/drive';
import { DriveFolderService } from '../../../src/services/drive/drive-folder.service';
import { SdkManager } from '../../../src/services/sdk-manager.service';
import { DriveUtils } from '../../../src/utils/drive.utils';
import { generateSubcontent, newFolderMeta } from '../../fixtures/drive.fixture';
import { CreateFolderResponse } from '@internxt/sdk/dist/drive/storage/types';

describe('Drive folder Service', () => {
  let sut: DriveFolderService;
  const sandbox = sinon.createSandbox();

  beforeEach(() => {
    sut = DriveFolderService.instance;
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('When folder metadata is requested by UUID, it is aquired correctly', async () => {
    const expectedFolderMeta = newFolderMeta();
    const expectedFolderItem = DriveUtils.driveFolderMetaToItem(expectedFolderMeta);

    const spy = sandbox.stub(Storage.prototype, 'getFolderMeta').resolves(expectedFolderMeta);
    sandbox.stub(SdkManager.instance, 'getStorage').returns(Storage.prototype);

    const resultMetadata = await sut.getFolderMetaByUuid(expectedFolderMeta.uuid);

    expect(resultMetadata).to.deep.equal(expectedFolderItem);
    expect(spy).to.be.calledWith(expectedFolderMeta.uuid);
  });

  it('When folder metadata is requested by ID, it is aquired correctly', async () => {
    const expectedFolderMeta = newFolderMeta();
    const expectedFolderItem = DriveUtils.driveFolderMetaToItem(expectedFolderMeta);

    const spy = sandbox.stub(Storage.prototype, 'getFolderMetaById').resolves(expectedFolderMeta);
    sandbox.stub(SdkManager.instance, 'getStorage').returns(Storage.prototype);

    const resultMetadata = await sut.getFolderMetaById(expectedFolderMeta.id);

    expect(resultMetadata).to.deep.equal(expectedFolderItem);
    expect(spy).to.be.calledWith(expectedFolderMeta.id);
  });

  it('When folder content is requested, then all its subfolders and subfiles are returned', async () => {
    const parentUuid = randomUUID();
    const subContentFixture = generateSubcontent(parentUuid, 112, 117); //112 subfolders and 117 subfiles
    const requestCancelerMock = { cancel: () => {} };

    sandbox
      .stub(Storage.prototype, 'getFolderFoldersByUuid')
      .withArgs(parentUuid, 0)
      .returns([Promise.resolve({ folders: subContentFixture.folders.slice(0, 50) }), requestCancelerMock])
      .withArgs(parentUuid, 50)
      .returns([Promise.resolve({ folders: subContentFixture.folders.slice(50, 100) }), requestCancelerMock])
      .withArgs(parentUuid, 100)
      .returns([Promise.resolve({ folders: subContentFixture.folders.slice(100, 112) }), requestCancelerMock])
      .withArgs(parentUuid, 112)
      .returns([Promise.resolve({ folders: [] }), requestCancelerMock]);
    sandbox
      .stub(Storage.prototype, 'getFolderFilesByUuid')
      .withArgs(parentUuid, 0)
      .returns([Promise.resolve({ files: subContentFixture.files.slice(0, 50) }), requestCancelerMock])
      .withArgs(parentUuid, 50)
      .returns([Promise.resolve({ files: subContentFixture.files.slice(50, 100) }), requestCancelerMock])
      .withArgs(parentUuid, 100)
      .returns([Promise.resolve({ files: subContentFixture.files.slice(100, 117) }), requestCancelerMock])
      .withArgs(parentUuid, 117)
      .returns([Promise.resolve({ files: [] }), requestCancelerMock]);
    sandbox.stub(SdkManager.instance, 'getStorage').returns(Storage.prototype);

    const resultContent = await sut.getFolderContent(parentUuid);

    expect(subContentFixture).to.deep.equal(resultContent);
  });

  it('When a folder is created, the new folder and a request canceler are returned', async () => {
    const newFolderResponse: CreateFolderResponse = {
      parentId: 123,
      bucket: 'bucket1',
      id: 0,
      name: 'folder-1',
      plain_name: 'folder-1',
      createdAt: '',
      updatedAt: '',
      userId: 0,
      uuid: '1234-5678-9012-3456',
      parentUuid: '0123-5678-9012-3456',
    };
    sandbox
      .stub(Storage.prototype, 'createFolder')
      .returns([Promise.resolve<CreateFolderResponse>(newFolderResponse), { cancel: () => {} }]);
    sandbox.stub(SdkManager.instance, 'getStorage').returns(Storage.prototype);
    const [createFolder] = sut.createFolder({
      folderName: 'folder-1',
      parentFolderId: 123,
    });

    const newFolder = await createFolder;
    expect(newFolder.plain_name).to.be.eq('folder-1');
  });
});
