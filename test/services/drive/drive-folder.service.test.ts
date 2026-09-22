import { beforeEach, describe, expect, test, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { Storage } from '@internxt/sdk/dist/drive';
import { DriveFolderService } from '../../../src/services/drive/drive-folder.service';
import { SdkManager } from '../../../src/services/sdk-manager.service';
import { DriveUtils } from '../../../src/utils/drive.utils';
import { generateSubcontent, newCreateFolderResponse, newFolderMeta } from '../../fixtures/drive.fixture';
import {
  CheckDuplicatedFoldersResponse,
  CreateFolderResponse,
  FolderMeta,
} from '@internxt/sdk/dist/drive/storage/types';
import { NotFoundError, ServiceUnavailableError } from '../../../src/utils/errors.utils';
import { ConfigService } from '../../../src/services/config.service';
import { UserCredentialsFixture } from '../../fixtures/login.fixture';

describe('Drive Folder Service', () => {
  const sut = DriveFolderService.instance;

  beforeEach(() => {
    vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(UserCredentialsFixture);
    vi.spyOn(ConfigService.instance, 'saveUser').mockResolvedValue(undefined);
  });

  test('when folder metadata is requested by its identifier, then it is acquired successfully', async () => {
    const expectedFolderMeta = newFolderMeta();
    const expectedFolderItem = DriveUtils.driveFolderMetaToItem(expectedFolderMeta);

    const spy = vi.spyOn(Storage.prototype, 'getFolderMeta').mockResolvedValue(expectedFolderMeta);
    vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue(Storage.prototype);

    const resultMetadata = await sut.getFolderMetaByUuid(expectedFolderMeta.uuid);

    expect(resultMetadata).to.deep.equal(expectedFolderItem);
    expect(spy).toHaveBeenCalledWith(expectedFolderMeta.uuid);
  });

  test('when folder metadata is requested by its internal identifier, then it is acquired successfully', async () => {
    const expectedFolderMeta = newFolderMeta();
    const expectedFolderItem = DriveUtils.driveFolderMetaToItem(expectedFolderMeta);

    const spy = vi.spyOn(Storage.prototype, 'getFolderMetaById').mockResolvedValue(expectedFolderMeta);
    vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue(Storage.prototype);

    const resultMetadata = await sut.getFolderMetaById(expectedFolderMeta.id);

    expect(resultMetadata).to.deep.equal(expectedFolderItem);
    expect(spy).toHaveBeenCalledWith(expectedFolderMeta.id);
  });

  test('when folder content is requested, then every cursor page of subfolders and subfiles is returned', async () => {
    const parentUuid = randomUUID();
    const subContentFixture = generateSubcontent(parentUuid, 2500, 1200);
    const requestCancelerMock = { cancel: () => {} };
    const pageOf = <T>(items: T[], cursor: string | undefined) => {
      const start = cursor ? Number(cursor) : 0;
      const end = start + 1000;
      return { page: items.slice(start, end), nextCursor: end < items.length ? String(end) : null };
    };

    const foldersSpy = vi
      .spyOn(Storage.prototype, 'getFolderFoldersByUuidWithCursor')
      .mockImplementation((_, query) => {
        const { page, nextCursor } = pageOf(subContentFixture.folders, query?.cursor);
        return [Promise.resolve({ folders: page, nextCursor }), requestCancelerMock];
      });
    const filesSpy = vi.spyOn(Storage.prototype, 'getFolderFilesByUuidWithCursor').mockImplementation((_, query) => {
      const { page, nextCursor } = pageOf(subContentFixture.files, query?.cursor);
      return [Promise.resolve({ files: page, nextCursor }), requestCancelerMock];
    });
    vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue(Storage.prototype);

    const resultContent = await sut.getFolderContent(parentUuid);

    expect(resultContent).to.deep.equal(subContentFixture);
    expect(foldersSpy).toHaveBeenCalledTimes(3);
    expect(foldersSpy.mock.calls.map(([, query]) => query)).toEqual([
      { limit: 1000, order: 'ASC', cursor: undefined },
      { limit: 1000, order: 'ASC', cursor: '1000' },
      { limit: 1000, order: 'ASC', cursor: '2000' },
    ]);
    expect(filesSpy).toHaveBeenCalledTimes(2);
    expect(filesSpy.mock.calls.map(([, query]) => query)).toEqual([
      { limit: 1000, order: 'ASC', cursor: undefined },
      { limit: 1000, order: 'ASC', cursor: '1000' },
    ]);
  });

  test('when an empty folder content is requested, then a single request per type is made', async () => {
    const parentUuid = randomUUID();
    const requestCancelerMock = { cancel: () => {} };
    const foldersSpy = vi
      .spyOn(Storage.prototype, 'getFolderFoldersByUuidWithCursor')
      .mockReturnValue([Promise.resolve({ folders: [], nextCursor: null }), requestCancelerMock]);
    const filesSpy = vi
      .spyOn(Storage.prototype, 'getFolderFilesByUuidWithCursor')
      .mockReturnValue([Promise.resolve({ files: [], nextCursor: null }), requestCancelerMock]);
    vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue(Storage.prototype);

    const resultContent = await sut.getFolderContent(parentUuid);

    expect(resultContent).to.deep.equal({ folders: [], files: [] });
    expect(foldersSpy).toHaveBeenCalledOnce();
    expect(foldersSpy).toHaveBeenCalledWith(parentUuid, { limit: 1000, order: 'ASC', cursor: undefined });
    expect(filesSpy).toHaveBeenCalledOnce();
    expect(filesSpy).toHaveBeenCalledWith(parentUuid, { limit: 1000, order: 'ASC', cursor: undefined });
  });

  test('when a page arrives without items, then it throws instead of returning a partial listing', async () => {
    const parentUuid = randomUUID();
    const subContentFixture = generateSubcontent(parentUuid, 1200, 0);
    const requestCancelerMock = { cancel: () => {} };

    vi.spyOn(Storage.prototype, 'getFolderFoldersByUuidWithCursor').mockImplementation((_, query) => {
      const folders = query?.cursor ? undefined : subContentFixture.folders.slice(0, 1000);
      return [Promise.resolve({ folders, nextCursor: query?.cursor ? null : 'next' } as never), requestCancelerMock];
    });
    vi.spyOn(Storage.prototype, 'getFolderFilesByUuidWithCursor').mockReturnValue([
      Promise.resolve({ files: [], nextCursor: null }),
      requestCancelerMock,
    ]);
    vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue(Storage.prototype);

    await expect(sut.getFolderContent(parentUuid)).rejects.toThrow('Unusable folder content received from the API');
  });

  test('when a folder is created, then the new folder and a request canceler are returned', async () => {
    const newFolderResponse = newCreateFolderResponse();

    vi.spyOn(Storage.prototype, 'createFolderByUuid').mockReturnValue([
      Promise.resolve<CreateFolderResponse>(newFolderResponse),
      { cancel: () => {} },
    ]);
    vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue(Storage.prototype);

    const [createFolder] = await sut.createFolder({
      plainName: newFolderResponse.plainName,
      parentFolderUuid: newFolderResponse.parentUuid,
    });

    const newFolder = await createFolder;
    expect(newFolder).to.be.equal(newFolderResponse);
  });

  test('when a folder with the given name exists in the parent, then it is returned as a folder item', async () => {
    const existentFolder = newCreateFolderResponse({ plainName: 'backup', uuid: 'backup-uuid' });
    const spy = vi
      .spyOn(Storage.prototype, 'checkDuplicatedFolders')
      .mockResolvedValue({ existentFolders: [existentFolder] } as unknown as CheckDuplicatedFoldersResponse);
    vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue(Storage.prototype);

    const result = await sut.findExistentFolder('parent-uuid', 'backup');

    expect(spy).toHaveBeenCalledWith({ folderUuid: 'parent-uuid', folderNamesList: ['backup'] });
    expect(result).toMatchObject({ itemType: 'folder', uuid: 'backup-uuid', name: 'backup', status: 'EXISTS' });
  });

  test('when no folder with the given name exists in the parent, then nothing is returned', async () => {
    vi.spyOn(Storage.prototype, 'checkDuplicatedFolders').mockResolvedValue({ existentFolders: [] });
    vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue(Storage.prototype);

    expect(await sut.findExistentFolder('parent-uuid', 'backup')).toBeUndefined();
  });

  test('when the API answers a path lookup with an empty body, then a retryable error is thrown', async () => {
    vi.spyOn(Storage.prototype, 'getFolderByPath').mockResolvedValue('' as unknown as FolderMeta);
    vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue(Storage.prototype);

    await expect(sut.getFolderMetaByPath('/a/b/')).rejects.toBeInstanceOf(ServiceUnavailableError);
  });

  test('when a path lookup answers with a trashed folder, then a not found error is thrown', async () => {
    vi.spyOn(Storage.prototype, 'getFolderByPath').mockResolvedValue(newFolderMeta({ removed: true }));
    vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue(Storage.prototype);

    await expect(sut.getFolderMetaByPath('/a/b/')).rejects.toBeInstanceOf(NotFoundError);
  });

  test('when the API answers a uuid lookup with an empty body, then a retryable error is thrown', async () => {
    vi.spyOn(Storage.prototype, 'getFolderMeta').mockResolvedValue('' as unknown as FolderMeta);
    vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue(Storage.prototype);

    await expect(sut.getFolderMetaByUuid(randomUUID())).rejects.toBeInstanceOf(ServiceUnavailableError);
  });
});
