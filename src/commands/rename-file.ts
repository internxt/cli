import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { EmptyFileNameError, MissingCredentialsError, NotValidFileUuidError } from '../types/command.types';
import { ValidationService } from '../services/validation.service';
import { DriveFileService } from '../services/drive/drive-file.service';
import { ErrorUtils } from '../utils/errors.utils';

export default class RenameFile extends Command {
  static readonly args = {};
  static readonly description = 'Rename a file.';
  static readonly aliases = ['rename:file'];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];

  static readonly flags = {
    ...CLIUtils.CommonFlags,
    id: Flags.string({
      char: 'i',
      description: 'The ID of the file to rename.',
      required: false,
    }),
    name: Flags.string({
      char: 'n',
      description: 'The new name for the file.',
      required: false,
    }),
  };

  public async run() {
    const { flags } = await this.parse(RenameFile);

    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const fileUuid = await this.getFileUuid(flags['id'], nonInteractive);
    const newName = await this.getNewName(flags['name'], nonInteractive);

    await DriveFileService.instance.renameFile(fileUuid, { plainName: newName });
    CLIUtils.success(`File renamed successfully with: ${newName}`);
  }

  async catch(error: Error) {
    ErrorUtils.report(error, { command: this.id });
    CLIUtils.error(error.message);
    this.exit(1);
  }

  public getFileUuid = async (fileUuidFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    let fileUuid = CLIUtils.getValueFromFlag(
      {
        value: fileUuidFlag,
        name: RenameFile.flags['id'].name,
        error: new NotValidFileUuidError(),
        canBeEmpty: true,
      },
      nonInteractive,
      (fileUuid: string) => ValidationService.instance.validateUUIDv4(fileUuid),
    );
    if (!fileUuid) {
      fileUuid = (await this.getFileUuidInteractively()).trim();
    }
    return fileUuid;
  };

  public getNewName = async (newNameUuidFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    let newName = CLIUtils.getValueFromFlag(
      {
        value: newNameUuidFlag,
        name: RenameFile.flags['name'].name,
        error: new EmptyFileNameError(),
        canBeEmpty: true,
      },
      nonInteractive,
      (password: string) => password.trim().length > 0,
    );
    if (!newName) {
      newName = (await this.getNewNameInteractively()).trim();
    }
    return newName;
  };

  private static readonly MAX_ATTEMPTS = 3;

  public getFileUuidInteractively = (): Promise<string> => {
    return CLIUtils.promptWithAttempts(
      {
        message: 'What is the file id you want to rename?',
        options: { required: true },
        error: new NotValidFileUuidError(),
      },
      RenameFile.MAX_ATTEMPTS,
      ValidationService.instance.validateUUIDv4,
    );
  };

  public getNewNameInteractively = (): Promise<string> => {
    return CLIUtils.promptWithAttempts(
      {
        message: 'What is the new name of the file?',
        options: { required: false },
        error: new EmptyFileNameError(),
      },
      RenameFile.MAX_ATTEMPTS,
      (newName: string) => newName.trim().length > 0,
    );
  };
}
