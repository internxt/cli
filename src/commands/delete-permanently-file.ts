import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { MissingCredentialsError, NotValidFileUuidError } from '../types/command.types';
import { ValidationService } from '../services/validation.service';
import { DriveFileService } from '../services/drive/drive-file.service';
import { TrashService } from '../services/drive/trash.service';

export default class DeletePermanentlyFile extends Command {
  static readonly args = {};
  static readonly description = 'Deletes permanently a file. This action cannot be undone.';
  static readonly aliases = ['delete:permanently:file'];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {
    ...CLIUtils.CommonFlags,
    id: Flags.string({
      char: 'i',
      description: 'The file id to be permanently deleted.',
      required: false,
    }),
  };
  static readonly enableJsonFlag = true;

  public run = async () => {
    const { flags } = await this.parse(DeletePermanentlyFile);

    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const fileUuid = await this.getFileUuid(flags['id'], nonInteractive);
    const driveFile = await DriveFileService.instance.getFileMetadata(fileUuid);
    if (!driveFile) {
      throw new Error('File not found');
    }

    await TrashService.instance.deleteFile({ fileId: driveFile.id, folderId: driveFile.folderId });
    const message = 'File permanently deleted successfully';
    CLIUtils.success(this.log.bind(this), message);
    return { success: true, message };
  };

  public catch = async (error: Error) => {
    const { flags } = await this.parse(DeletePermanentlyFile);
    CLIUtils.catchError({
      error,
      command: this.id,
      logReporter: this.log.bind(this),
      errorReporter: this.error.bind(this),
      jsonFlag: flags['json'],
    });
    this.exit(1);
  };

  private getFileUuid = async (fileUuidFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    const fileUuid = await CLIUtils.getValueFromFlag(
      {
        value: fileUuidFlag,
        name: DeletePermanentlyFile.flags['id'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is the file id you want to permanently delete? (This action cannot be undone)',
          options: { type: 'input' },
        },
      },
      {
        validate: ValidationService.instance.validateUUIDv4,
        error: new NotValidFileUuidError(),
      },
      this.log.bind(this),
    );
    return fileUuid;
  };
}
