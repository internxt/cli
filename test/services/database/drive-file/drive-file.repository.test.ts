import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DriveFileRepository } from '../../../../src/services/database/drive-file/drive-file.repository';
import DriveFileModel from '../../../../src/services/database/drive-file/drive-file.model';

describe('Drive File repository', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
    const driveFileModelFindStub = vi
      .spyOn(DriveFileModel, 'findByPk')
      .mockResolvedValue(databaseItem as DriveFileModel);
    const result = await sut.findById(123);

    expect(driveFileModelFindStub).to.toHaveBeenCalledOnce();
    expect(result?.type).to.be.equal('png');
    expect(result?.name).to.be.equal('file1');
    expect(result?.uuid).to.be.equal('44444555');
  });
});
