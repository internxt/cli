import { beforeEach, describe, expect, test, MockInstance, vi } from 'vitest';
import { stat } from 'fs/promises';
import { createReadStream } from 'fs';
import UploadFile from '../../src/commands/upload-file';
import { LoginCredentials } from '../../src/types/command.types';
import { ValidationService } from '../../src/services/validation.service';
import { UserFixture } from '../fixtures/auth.fixture';
import { newFileItem } from '../fixtures/drive.fixture';
import { CLIUtils } from '../../src/utils/cli.utils';
import { ConfigService } from '../../src/services/config.service';
import { DriveFileService } from '../../src/services/drive/drive-file.service';
import { ThumbnailService } from '../../src/services/thumbnail.service';
import { NetworkFacade } from '../../src/services/network/network-facade.service';
import { createMockStats, createMockReadStream } from '../services/network/upload/upload.service.helpers';

vi.mock('fs', () => ({
  createReadStream: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  stat: vi.fn(),
}));

describe('Upload File Command', () => {
  const destinationFolderUuid = 'dest-folder-uuid';
  const bucket = 'test-bucket';
  const mockNetworkFacade = {
    uploadFile: vi.fn().mockResolvedValue('mock-network-file-id'),
  } as unknown as NetworkFacade;

  let configReadUserSpy: MockInstance<() => Promise<LoginCredentials>>;
  let validateFileExistsSpy: MockInstance<(path: string) => Promise<boolean>>;
  let getDestinationFolderUuidSpy: MockInstance<() => Promise<string>>;
  let findExistentFileSpy: MockInstance<typeof DriveFileService.instance.findExistentFile>;
  let createFileSpy: MockInstance<typeof DriveFileService.instance.createFile>;
  let replaceFileSpy: MockInstance<typeof DriveFileService.instance.replaceFile>;
  let cliSuccessSpy: MockInstance<() => void>;

  const createdFile = newFileItem({ name: 'report' });

  beforeEach(() => {
    configReadUserSpy = vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue({
      user: UserFixture,
      token: 'mock-token',
    });
    validateFileExistsSpy = vi.spyOn(ValidationService.instance, 'validateFileExists').mockResolvedValue(true);
    getDestinationFolderUuidSpy = vi
      .spyOn(CLIUtils, 'getDestinationFolderUuid')
      .mockResolvedValue(destinationFolderUuid);
    vi.spyOn(CLIUtils, 'prepareNetwork').mockResolvedValue({ networkFacade: mockNetworkFacade, bucket, mnemonic: '' });
    vi.mocked(stat).mockResolvedValue(createMockStats(1024) as Awaited<ReturnType<typeof stat>>);
    vi.mocked(createReadStream).mockReturnValue(createMockReadStream() as ReturnType<typeof createReadStream>);
    findExistentFileSpy = vi.spyOn(DriveFileService.instance, 'findExistentFile').mockResolvedValue(undefined);
    createFileSpy = vi.spyOn(DriveFileService.instance, 'createFile').mockResolvedValue(createdFile);
    replaceFileSpy = vi.spyOn(DriveFileService.instance, 'replaceFile').mockResolvedValue(createdFile);
    vi.spyOn(ThumbnailService.instance, 'tryUploadThumbnail').mockResolvedValue(undefined);
    cliSuccessSpy = vi.spyOn(CLIUtils, 'success').mockImplementation(() => {});
  });

  test('when the overwrite flag is not set, then the file is uploaded as a new file without checking for duplicates', async () => {
    await UploadFile.run(['--file=/path/to/report.txt']);

    expect(configReadUserSpy).toHaveBeenCalledOnce();
    expect(validateFileExistsSpy).toHaveBeenCalledWith('/path/to/report.txt');
    expect(getDestinationFolderUuidSpy).toHaveBeenCalledOnce();
    expect(findExistentFileSpy).not.toHaveBeenCalled();
    expect(createFileSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        plainName: 'report',
        type: 'txt',
        folderUuid: destinationFolderUuid,
      }),
    );
    expect(replaceFileSpy).not.toHaveBeenCalled();
    expect(cliSuccessSpy).toHaveBeenCalledWith(
      expect.any(Function),
      expect.stringContaining('File uploaded successfully'),
    );
  });

  test('when the overwrite flag is set but no file with the same name exists, then a new file is created', async () => {
    await UploadFile.run(['--file=/path/to/report.txt', '--overwrite']);

    expect(findExistentFileSpy).toHaveBeenCalledWith(destinationFolderUuid, {
      plainName: 'report',
      type: 'txt',
    });
    expect(createFileSpy).toHaveBeenCalledOnce();
    expect(replaceFileSpy).not.toHaveBeenCalled();
    expect(cliSuccessSpy).toHaveBeenCalledWith(
      expect.any(Function),
      expect.stringContaining('File uploaded successfully'),
    );
  });

  test('when the overwrite flag is set and a file with the same name exists, then the existing file is replaced', async () => {
    const existingFile = newFileItem({ name: 'report', uuid: 'existing-file-uuid' });
    findExistentFileSpy.mockResolvedValue(existingFile);

    await UploadFile.run(['--file=/path/to/report.txt', '--overwrite']);

    expect(findExistentFileSpy).toHaveBeenCalledWith(destinationFolderUuid, {
      plainName: 'report',
      type: 'txt',
    });
    expect(replaceFileSpy).toHaveBeenCalledWith(
      'existing-file-uuid',
      expect.objectContaining({
        plainName: 'report',
        type: 'txt',
        folderUuid: destinationFolderUuid,
      }),
    );
    expect(createFileSpy).not.toHaveBeenCalled();
    expect(cliSuccessSpy).toHaveBeenCalledWith(
      expect.any(Function),
      expect.stringContaining('File overwritten successfully'),
    );
  });
});
