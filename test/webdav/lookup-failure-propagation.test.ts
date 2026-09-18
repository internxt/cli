import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PROPFINDRequestHandler } from '../../src/webdav/handlers/PROPFIND.handler';
import { PUTRequestHandler } from '../../src/webdav/handlers/PUT.handler';
import { MKCOLRequestHandler } from '../../src/webdav/handlers/MKCOL.handler';
import { MOVERequestHandler } from '../../src/webdav/handlers/MOVE.handler';
import { DELETERequestHandler } from '../../src/webdav/handlers/DELETE.handler';
import {
  createWebDavRequestFixture,
  createWebDavResponseFixture,
  getWebdavConfigMock,
} from '../fixtures/webdav.fixture';
import { UserCredentialsFixture } from '../fixtures/login.fixture';
import { AuthService } from '../../src/services/auth.service';
import { ConfigService } from '../../src/services/config.service';
import { DriveItemService } from '../../src/services/drive/drive-item.service';
import { DriveFileService } from '../../src/services/drive/drive-file.service';
import { DriveFolderService } from '../../src/services/drive/drive-folder.service';
import { WebDavFolderService } from '../../src/services/webdav/webdav-folder.service';
import { TrashService } from '../../src/services/drive/trash.service';
import { UploadUtils } from '../../src/utils/upload.utils';
import { ServiceUnavailableError } from '../../src/utils/errors.utils';

/** A lookup that cannot be completed must leave the handler inert: nothing created, moved or
 * trashed on a false "not found". */
describe('WebDAV handlers when a path lookup cannot be completed', () => {
  const lookupTimedOut = () => {
    const error = new ServiceUnavailableError('Lookup at path could not be completed, retry later');
    vi.spyOn(DriveItemService.instance, 'getFileByPath').mockRejectedValue(error);
    vi.spyOn(DriveItemService.instance, 'getFolderByPath').mockRejectedValue(error);
  };

  const response = () => createWebDavResponseFixture({ status: vi.fn().mockReturnThis() });

  beforeEach(() => {
    vi.spyOn(AuthService.instance, 'getAuthDetails').mockResolvedValue(UserCredentialsFixture);
    vi.spyOn(ConfigService.instance, 'readWebdavConfig').mockResolvedValue(getWebdavConfigMock());
    lookupTimedOut();
  });

  test('PROPFIND reports the failure instead of telling the client the resource is gone', async () => {
    const request = createWebDavRequestFixture({ method: 'PROPFIND', url: '/folder/file.txt', headers: {} });

    await expect(new PROPFINDRequestHandler().handle(request, response())).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
  });

  test('PUT does not create the parent folders it could not verify', async () => {
    vi.spyOn(UploadUtils, 'checkUploadSizeLimits').mockResolvedValue(undefined);
    const createFolderSpy = vi.spyOn(WebDavFolderService.instance, 'createFolder');
    const createFileSpy = vi.spyOn(DriveFileService.instance, 'createFile');
    const request = createWebDavRequestFixture({
      method: 'PUT',
      url: '/folder/file.txt',
      headers: { 'content-length': '10' },
    });

    await expect(new PUTRequestHandler().handle(request, response())).rejects.toBeInstanceOf(ServiceUnavailableError);
    expect(createFolderSpy).not.toHaveBeenCalled();
    expect(createFileSpy).not.toHaveBeenCalled();
  });

  test('MKCOL does not create a folder that may already exist', async () => {
    const createFolderSpy = vi.spyOn(WebDavFolderService.instance, 'createFolder');
    const request = createWebDavRequestFixture({ method: 'MKCOL', url: '/folder/new/', headers: {} });

    await expect(new MKCOLRequestHandler().handle(request, response())).rejects.toBeInstanceOf(ServiceUnavailableError);
    expect(createFolderSpy).not.toHaveBeenCalled();
  });

  test('MOVE does not move an item it could not resolve', async () => {
    const moveFileSpy = vi.spyOn(DriveFileService.instance, 'moveFile');
    const moveFolderSpy = vi.spyOn(DriveFolderService.instance, 'moveFolder');
    const request = createWebDavRequestFixture({
      method: 'MOVE',
      url: '/folder/file.txt',
      headers: {},
      header: vi.fn((name: string) => (name === 'destination' ? 'http://localhost/folder/renamed.txt' : undefined)),
    });

    await expect(new MOVERequestHandler().handle(request, response())).rejects.toBeInstanceOf(ServiceUnavailableError);
    expect(moveFileSpy).not.toHaveBeenCalled();
    expect(moveFolderSpy).not.toHaveBeenCalled();
  });

  test('DELETE does not trash anything when it could not resolve the target', async () => {
    const trashSpy = vi.spyOn(TrashService.instance, 'trashItems');
    const request = createWebDavRequestFixture({ method: 'DELETE', url: '/folder/file.txt', headers: {} });

    await expect(new DELETERequestHandler().handle(request, response())).rejects.toBeInstanceOf(
      ServiceUnavailableError,
    );
    expect(trashSpy).not.toHaveBeenCalled();
  });
});
