import { beforeEach, describe, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Storage } from '@internxt/sdk/dist/drive';
import { DriveFolderService } from '../../../src/services/drive/drive-folder.service';
import { SdkManager } from '../../../src/services/sdk-manager.service';
import { DriveUtils } from '../../../src/utils/drive.utils';
import { generateSubcontent, newCreateFolderResponse, newFolderMeta } from '../../fixtures/drive.fixture';
import { CreateFolderResponse, FetchPaginatedFile, FetchPaginatedFolder } from '@internxt/sdk/dist/drive/storage/types';

describe('Drive folder Service', () => {
  const sut = DriveFolderService.instance;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When folder metadata is requested by UUID, it is aquired successfully', async () => {
    const expectedFolderMeta = newFolderMeta();
    const expectedFolderItem = DriveUtils.driveFolderMetaToItem(expectedFolderMeta);

    const spy = vi.spyOn(Storage.prototype, 'getFolderMeta').mockResolvedValue(expectedFolderMeta);
    vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue(Storage.prototype);

    const resultMetadata = await sut.getFolderMetaByUuid(expectedFolderMeta.uuid);

    expect(resultMetadata).to.deep.equal(expectedFolderItem);
    expect(spy).toHaveBeenCalledWith(expectedFolderMeta.uuid);
  });

  it('When folder metadata is requested by ID, it is aquired successfully', async () => {
    const expectedFolderMeta = newFolderMeta();
    const expectedFolderItem = DriveUtils.driveFolderMetaToItem(expectedFolderMeta);

    const spy = vi.spyOn(Storage.prototype, 'getFolderMetaById').mockResolvedValue(expectedFolderMeta);
    vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue(Storage.prototype);

    const resultMetadata = await sut.getFolderMetaById(expectedFolderMeta.id);

    expect(resultMetadata).to.deep.equal(expectedFolderItem);
    expect(spy).toHaveBeenCalledWith(expectedFolderMeta.id);
  });

  it('When folder content is requested, then all its subfolders and subfiles are returned', async () => {
    const parentUuid = randomUUID();
    const subContentFixture = generateSubcontent(parentUuid, 112, 117); //112 subfolders and 117 subfiles
    const requestCancelerMock = { cancel: () => {} };

    vi.spyOn(Storage.prototype, 'getFolderFoldersByUuid').mockImplementation((_: string, offset) => {
      let foldersContent: FetchPaginatedFolder[] = [];
      if (offset === 0) {
        foldersContent = subContentFixture.folders.slice(0, 50);
      } else if (offset === 50) {
        foldersContent = subContentFixture.folders.slice(50, 100);
      } else if (offset === 100) {
        foldersContent = subContentFixture.folders.slice(100, 112);
      } else if (offset === 112) {
        foldersContent = [];
      }
      return [Promise.resolve({ folders: foldersContent }), requestCancelerMock];
    });
    vi.spyOn(Storage.prototype, 'getFolderFilesByUuid').mockImplementation((_: string, offset) => {
      let filesContent: FetchPaginatedFile[] = [];
      if (offset === 0) {
        filesContent = subContentFixture.files.slice(0, 50);
      } else if (offset === 50) {
        filesContent = subContentFixture.files.slice(50, 100);
      } else if (offset === 100) {
        filesContent = subContentFixture.files.slice(100, 117);
      } else if (offset === 117) {
        filesContent = [];
      }
      return [Promise.resolve({ files: filesContent }), requestCancelerMock];
    });
    vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue(Storage.prototype);

    const resultContent = await sut.getFolderContent(parentUuid);

    expect(subContentFixture).to.deep.equal(resultContent);
  });

  it('When a folder is created, the new folder and a request canceler are returned', async () => {
    const newFolderResponse = newCreateFolderResponse();

    vi.spyOn(Storage.prototype, 'createFolderByUuid').mockReturnValue([
      Promise.resolve<CreateFolderResponse>(newFolderResponse),
      { cancel: () => {} },
    ]);
    vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue(Storage.prototype);

    const [createFolder] = sut.createFolder({
      plainName: newFolderResponse.plainName,
      parentFolderUuid: newFolderResponse.parentUuid,
    });

    const newFolder = await createFolder;
    expect(newFolder).to.be.equal(newFolderResponse);
  });
});
