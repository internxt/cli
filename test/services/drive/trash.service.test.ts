import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Storage } from '@internxt/sdk/dist/drive';
import { TrashService } from '../../../src/services/drive/trash.service';
import { SdkManager } from '../../../src/services/sdk-manager.service';
import { generateSubcontent, pageOf } from '../../fixtures/drive.fixture';
import { FetchFilesSyncResponse, FetchFoldersSyncResponse } from '@internxt/sdk/dist/drive/storage/types';

type TrashedFolder = FetchFoldersSyncResponse['folders'][number];
type TrashedFile = FetchFilesSyncResponse['files'][number];
import { ConfigService } from '../../../src/services/config.service';
import { UserCredentialsFixture } from '../../fixtures/login.fixture';

describe('Trash Service', () => {
  const sut = TrashService.instance;
  const requestCancelerMock = { cancel: () => {} };
  beforeEach(() => {
    vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(UserCredentialsFixture);
    vi.spyOn(ConfigService.instance, 'saveUser').mockResolvedValue(undefined);
    vi.spyOn(SdkManager.instance, 'getStorage').mockReturnValue(Storage.prototype);
  });

  test('when trash content is requested, then every trashed page is fetched from the sync endpoints', async () => {
    const trashed = generateSubcontent('', 1500, 2200) as unknown as {
      folders: TrashedFolder[];
      files: TrashedFile[];
    };
    const foldersSpy = vi.spyOn(Storage.prototype, 'getFoldersSync').mockImplementation((query) => {
      const { page, nextCursor } = pageOf(trashed.folders, query.cursor);
      return [Promise.resolve({ folders: page, nextCursor }), requestCancelerMock];
    });
    const filesSpy = vi.spyOn(Storage.prototype, 'getFilesSync').mockImplementation((query) => {
      const { page, nextCursor } = pageOf(trashed.files, query.cursor);
      return [Promise.resolve({ files: page, nextCursor }), requestCancelerMock];
    });

    const result = await sut.getTrashFolderContent();

    expect(result).to.deep.equal(trashed);
    expect(foldersSpy.mock.calls.map(([query]) => query)).toEqual([
      { updatedAt: '1970-01-01T00:00:00.000Z', status: 'TRASHED', limit: 1000 },
      { cursor: '1000', status: 'TRASHED', limit: 1000 },
    ]);
    expect(filesSpy.mock.calls.map(([query]) => query)).toEqual([
      { updatedAt: '1970-01-01T00:00:00.000Z', status: 'TRASHED', limit: 1000 },
      { cursor: '1000', status: 'TRASHED', limit: 1000 },
      { cursor: '2000', status: 'TRASHED', limit: 1000 },
    ]);
  });

  test('when a page arrives without items, then it throws instead of returning a partial listing', async () => {
    vi.spyOn(Storage.prototype, 'getFoldersSync').mockReturnValue([
      Promise.resolve({ folders: undefined, nextCursor: null } as never),
      requestCancelerMock,
    ]);
    vi.spyOn(Storage.prototype, 'getFilesSync').mockReturnValue([
      Promise.resolve({ files: [], nextCursor: null }),
      requestCancelerMock,
    ]);

    await expect(sut.getTrashFolderContent()).rejects.toThrow('Unusable page received from the API');
  });
});
