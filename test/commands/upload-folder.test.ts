import { beforeEach, describe, expect, test, MockInstance, vi } from 'vitest';
import UploadFolder from '../../src/commands/upload-folder';
import { LoginCredentials } from '../../src/types/command.types';
import { ValidationService } from '../../src/services/validation.service';
import { UserFixture } from '../fixtures/auth.fixture';
import { CLIUtils, NoFlagProvidedError } from '../../src/utils/cli.utils';
import { UploadResult } from '../../src/services/network/upload/upload.types';
import { UploadFacade } from '../../src/services/network/upload/upload-facade.service';
import { AsyncUtils } from '../../src/utils/async.utils';
import { ConfigService } from '../../src/services/config.service';

describe('Upload Folder Command', () => {
  let configReadUserSpy: MockInstance<() => Promise<LoginCredentials>>;
  let validateDirectoryExistsSpy: MockInstance<(path: string) => Promise<boolean>>;
  let getDestinationFolderUuidSpy: MockInstance<() => Promise<string>>;
  let UploadFacadeSpy: MockInstance<() => Promise<UploadResult>>;
  let cliSuccessSpy: MockInstance<() => void>;

  const uploadedResult: UploadResult = {
    totalBytes: 1024,
    rootFolderId: 'root-folder-id',
    uploadTimeMs: 1500,
  };

  beforeEach(() => {
    configReadUserSpy = vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue({
      user: UserFixture,
      token: 'mock-token',
    });
    vi.spyOn(ConfigService.instance, 'saveUser').mockResolvedValue(undefined);
    validateDirectoryExistsSpy = vi
      .spyOn(ValidationService.instance, 'validateDirectoryExists')
      .mockResolvedValue(true);
    getDestinationFolderUuidSpy = vi.spyOn(CLIUtils, 'getDestinationFolderUuid').mockResolvedValue('');
    UploadFacadeSpy = vi.spyOn(UploadFacade.instance, 'uploadFolder').mockResolvedValue(uploadedResult);
    cliSuccessSpy = vi.spyOn(CLIUtils, 'success').mockImplementation(() => {});
    vi.spyOn(AsyncUtils, 'sleep').mockResolvedValue(undefined);
  });

  test('when user uploads a folder with a valid path, then the upload process completes successfully', async () => {
    await UploadFolder.run(['--folder=/valid/folder/path']);

    expect(configReadUserSpy).toHaveBeenCalledTimes(2);
    expect(validateDirectoryExistsSpy).toHaveBeenCalledWith('/valid/folder/path');
    expect(getDestinationFolderUuidSpy).toHaveBeenCalledOnce();
    expect(UploadFacadeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        localPath: '/valid/folder/path',
        destinationFolderUuid: UserFixture.rootFolderId,
        loginUserDetails: UserFixture,
      }),
    );
    expect(cliSuccessSpy).toHaveBeenCalledOnce();
  });

  test('when a destination folder is specified, then the folder is uploaded to the chosen destination', async () => {
    const customDestinationId = 'custom-folder-uuid-123';

    const getDestinationFolderUuidSpy = vi
      .spyOn(CLIUtils, 'getDestinationFolderUuid')
      .mockResolvedValue(customDestinationId);

    await UploadFolder.run(['--folder=/valid/folder/path', `--destination=${customDestinationId}`]);

    expect(configReadUserSpy).toHaveBeenCalledOnce();
    expect(validateDirectoryExistsSpy).toHaveBeenCalledWith('/valid/folder/path');
    expect(getDestinationFolderUuidSpy).toHaveBeenCalledOnce();
    expect(UploadFacadeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        destinationFolderUuid: customDestinationId,
      }),
    );
    expect(cliSuccessSpy).toHaveBeenCalledOnce();
  });

  test('when no destination folder is specified, then the folder is uploaded to the default location', async () => {
    await UploadFolder.run(['--folder=/valid/folder/path']);

    expect(UploadFacadeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        destinationFolderUuid: UserFixture.rootFolderId,
      }),
    );
  });

  test('when upload succeeds, then a success message with upload time and link is displayed', async () => {
    const cliSuccessSpy = vi.spyOn(CLIUtils, 'success').mockImplementation(() => {});

    await UploadFolder.run(['--folder=/valid/folder/path']);

    expect(cliSuccessSpy).toHaveBeenCalledOnce();
    expect(cliSuccessSpy).toHaveBeenCalledWith(
      expect.any(Function),
      expect.stringContaining(`Folder uploaded in ${uploadedResult.uploadTimeMs}ms`),
    );
    expect(cliSuccessSpy).toHaveBeenCalledWith(
      expect.any(Function),
      expect.stringContaining(`folder/${uploadedResult.rootFolderId}`),
    );
  });

  test('when the folder path is invalid, then an error is shown', async () => {
    const validateDirectoryExistsSpy = vi
      .spyOn(ValidationService.instance, 'validateDirectoryExists')
      .mockResolvedValue(false);

    const invalidPath = '/invalid/folder/path.txt';
    const result = UploadFolder.run([`--folder=${invalidPath}`, '--non-interactive']);

    await expect(result).rejects.toMatchObject({
      message: expect.stringContaining('EEXIT: 1'),
      oclif: { exit: 1 },
    });

    expect(configReadUserSpy).toHaveBeenCalledOnce();
    expect(validateDirectoryExistsSpy).toHaveBeenCalledWith(invalidPath);
    expect(UploadFacadeSpy).not.toHaveBeenCalled();
  });

  test('when user is not logged in, then an error is shown', async () => {
    const readUserSpy = vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(undefined);

    const result = UploadFolder.run(['--folder=/some/folder/path']);

    await expect(result).rejects.toMatchObject({
      message: expect.stringContaining('EEXIT: 1'),
      oclif: { exit: 1 },
    });
    expect(readUserSpy).toHaveBeenCalledOnce();
    expect(validateDirectoryExistsSpy).not.toHaveBeenCalled();
    expect(UploadFacadeSpy).not.toHaveBeenCalled();
  });

  describe('Folder path resolution (getFolderPath)', () => {
    test('when no folder path is given in interactive mode, then the user is prompted for one', async () => {
      const getValueFromFlagSpy = vi.spyOn(CLIUtils, 'getValueFromFlag').mockResolvedValue('/prompted/folder/path');

      await UploadFolder.run([]);

      expect(getValueFromFlagSpy).toHaveBeenCalledWith(
        { value: undefined, name: 'folder' },
        expect.objectContaining({
          prompt: {
            message: 'What is the path to the folder on your computer?',
            options: { type: 'input' },
          },
        }),
        expect.objectContaining({
          validate: ValidationService.instance.validateDirectoryExists,
        }),
        expect.any(Function),
      );
      expect(UploadFacadeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          localPath: '/prompted/folder/path',
        }),
      );
    });

    test('when no folder path is given in non-interactive mode, then an error is shown', async () => {
      const getValueFromFlagSpy = vi
        .spyOn(CLIUtils, 'getValueFromFlag')
        .mockRejectedValue(new NoFlagProvidedError('folder'));

      const result = UploadFolder.run(['--non-interactive']);

      await expect(result).rejects.toMatchObject({
        message: expect.stringContaining('EEXIT: 1'),
        oclif: { exit: 1 },
      });

      expect(getValueFromFlagSpy).toHaveBeenCalledWith(
        { value: undefined, name: 'folder' },
        {
          nonInteractive: true,
          prompt: {
            message: 'What is the path to the folder on your computer?',
            options: { type: 'input' },
          },
        },
        {
          validate: ValidationService.instance.validateDirectoryExists,
          error: expect.any(Error),
        },
        expect.any(Function),
      );
      expect(UploadFacadeSpy).not.toHaveBeenCalled();
    });

    test('when a folder path is provided via the folder flag, then that path is used for the upload', async () => {
      await UploadFolder.run(['--folder=/explicit/folder/path']);

      expect(validateDirectoryExistsSpy).toHaveBeenCalledWith('/explicit/folder/path');
      expect(UploadFacadeSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          localPath: '/explicit/folder/path',
        }),
      );
    });
  });
});
