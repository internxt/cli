import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DriveFileService } from '../../../src/services/drive/drive-file.service';
import { SdkManager } from '../../../src/services/sdk-manager.service';
import Storage, { DriveFileData, EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import { Drive } from '@internxt/sdk';
import { randomUUID } from 'node:crypto';
import { CommonFixture } from '../../fixtures/common.fixture';

describe('Drive file Service', () => {
  const sut = DriveFileService.instance;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When a file is created, should be created successfully', async () => {
    const payload: Storage.FileEntryByUuid = {
      plain_name: 'example.txt',
      type: 'txt',
      size: 1024,
      folder_id: 'folder_uuid',
      id: 'fileId_123456',
      bucket: 'bucket123',
      encrypt_version: EncryptionVersion.Aes03,
      name: '',
    };

    const storageClientMock: Partial<Drive.Storage> = {
      createFileEntryByUuid: vi.fn().mockResolvedValue({
        id: 'example-id',
        uuid: 'example-uuid',
        createdAt: new Date(),
        updatedAt: new Date(),
        bucket: payload.bucket,
        plain_name: payload.plain_name,
        folderUuid: payload.folder_id,
      }),
    };

    // @ts-expect-error - We only stub the method we need to test
    vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue(storageClientMock);

    const result = await sut.createFile(payload);

    expect(result.bucket).to.be.equal(payload.bucket);
    expect(result.name).to.be.equal(payload.plain_name);
    expect(result.folderUuid).to.be.equal(payload.folder_id);
  });

  it('When we want to obtain a file metadata, should return it successfully', async () => {
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
      getFile: vi.fn().mockReturnValue([Promise.resolve(fakeFileData)]),
    };

    // @ts-expect-error - We only stub the method we need to test
    vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue(storageClientMock);

    const result = await sut.getFileMetadata(fakeFileData.uuid);

    expect(result.bucket).to.be.equal(fakeFileData.bucket);
    expect(result.uuid).to.be.equal(fakeFileData.uuid);
  });
});
