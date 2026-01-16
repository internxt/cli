import { beforeEach, describe, expect, it, MockInstance, vi } from 'vitest';
import UploadFolder from '../../src/commands/upload-folder';
import { AuthService } from '../../src/services/auth.service';
import { LoginCredentials, MissingCredentialsError } from '../../src/types/command.types';
import { ValidationService } from '../../src/services/validation.service';
import { UserFixture } from '../fixtures/auth.fixture';
import { CLIUtils, NoFlagProvidedError } from '../../src/utils/cli.utils';
import { UploadResult } from '../../src/services/network/upload/upload.types';
import { UploadFacade } from '../../src/services/network/upload/upload-facade.service';

vi.mock('../../src/utils/async.utils', () => ({
  AsyncUtils: {
    sleep: vi.fn().mockResolvedValue(undefined),
  },
}));

describe('Upload Folder Command', () => {
  let getAuthDetailsSpy: MockInstance<() => Promise<LoginCredentials>>;
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
    vi.restoreAllMocks();
    getAuthDetailsSpy = vi.spyOn(AuthService.instance, 'getAuthDetails').mockResolvedValue({
      user: UserFixture,
      token: 'mock-token',
    });
    validateDirectoryExistsSpy = vi
      .spyOn(ValidationService.instance, 'validateDirectoryExists')
      .mockResolvedValue(true);
    getDestinationFolderUuidSpy = vi.spyOn(CLIUtils, 'getDestinationFolderUuid').mockResolvedValue('');
    UploadFacadeSpy = vi.spyOn(UploadFacade.instance, 'uploadFolder').mockResolvedValue(uploadedResult);
    cliSuccessSpy = vi.spyOn(CLIUtils, 'success').mockImplementation(() => {});
  });

  it('should call UploadFacade when user uploads a folder with valid path', async () => {
    await UploadFolder.run(['--folder=/valid/folder/path']);

    expect(getAuthDetailsSpy).toHaveBeenCalledOnce();
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

  it('should use provided destination folder UUID when destination flag is passed', async () => {
    const customDestinationId = 'custom-folder-uuid-123';

    const getDestinationFolderUuidSpy = vi
      .spyOn(CLIUtils, 'getDestinationFolderUuid')
      .mockResolvedValue(customDestinationId);

    await UploadFolder.run(['--folder=/valid/folder/path', `--destination=${customDestinationId}`]);

    expect(getAuthDetailsSpy).toHaveBeenCalledOnce();
    expect(validateDirectoryExistsSpy).toHaveBeenCalledWith('/valid/folder/path');
    expect(getDestinationFolderUuidSpy).toHaveBeenCalledOnce();
    expect(UploadFacadeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        destinationFolderUuid: customDestinationId,
      }),
    );
    expect(cliSuccessSpy).toHaveBeenCalledOnce();
  });

  it('should default to user.rootFolderId when no destination is passed', async () => {
    await UploadFolder.run(['--folder=/valid/folder/path']);

    expect(UploadFacadeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        destinationFolderUuid: UserFixture.rootFolderId,
      }),
    );
  });

  it('should call CLIUtils.success with proper message when upload succeeds', async () => {
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

  it('should throw an error when user does not provide a valid path', async () => {
    const validateDirectoryExistsSpy = vi
      .spyOn(ValidationService.instance, 'validateDirectoryExists')
      .mockResolvedValue(false);

    const invalidPath = '/invalid/folder/path.txt';
    const result = UploadFolder.run([`--folder=${invalidPath}`, '--non-interactive']);

    await expect(result).rejects.toMatchObject({
      message: expect.stringContaining('EEXIT: 1'),
      oclif: { exit: 1 },
    });

    expect(getAuthDetailsSpy).toHaveBeenCalledOnce();
    expect(validateDirectoryExistsSpy).toHaveBeenCalledWith(invalidPath);
    expect(UploadFacadeSpy).not.toHaveBeenCalled();
  });

  it('should throw an error when user does not have credentials', async () => {
    const getAuthDetailsSpy = vi
      .spyOn(AuthService.instance, 'getAuthDetails')
      .mockRejectedValue(new MissingCredentialsError());

    const result = UploadFolder.run(['--folder=/some/folder/path']);
    await expect(result).rejects.toMatchObject({
      message: expect.stringContaining('EEXIT: 1'),
      oclif: { exit: 1 },
    });

    expect(getAuthDetailsSpy).toHaveBeenCalledOnce();
    expect(validateDirectoryExistsSpy).not.toHaveBeenCalled();
    expect(UploadFacadeSpy).not.toHaveBeenCalled();
  });

  describe('Folder path resolution (getFolderPath)', () => {
    it('should prompt user for folder path in interactive mode when --folder flag is not provided', async () => {
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

    it('should throw NoFlagProvidedError in non-interactive mode when --folder flag is not provided', async () => {
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

    it('should use folder path from --folder flag when provided', async () => {
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
