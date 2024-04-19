import sinon from 'sinon';
import { DriveFileRepository } from '../../../../src/services/database/drive-file/drive-file.repository';
import DriveFileModel from '../../../../src/services/database/drive-file/drive-file.model';
import { expect } from 'chai';

describe('Drive File repository', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  it('When a file is found by ID, should map it to a DriveFile object', async () => {
    const sut = new DriveFileRepository();

    const databaseItem: Partial<DriveFileModel> = {
      id: 123,
      type: 'png',
      name: 'file1',
      uuid: '44444555',
      fileId: '123',
      folderId: 49,
      bucket: '123',
      relativePath: '/file1.png',
      size: 15,
      status: 'EXISTS',
      createdAt: new Date(),
      updatedAt: new Date(),
      toJSON: () => databaseItem,
    };
    const driveFileModelFindStub = sandbox.stub(DriveFileModel, 'findByPk').resolves(databaseItem as DriveFileModel);
    const result = await sut.findById(123);

    expect(driveFileModelFindStub.calledOnce).to.be.true;

    expect(result?.type).to.eq('png');
  });
});
