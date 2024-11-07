import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { MissingCredentialsError, NotValidFileUuidError, NotValidFolderUuidError } from '../types/command.types';
import { ValidationService } from '../services/validation.service';
import { DriveFileService } from '../services/drive/drive-file.service';
import { ErrorUtils } from '../utils/errors.utils';

export default class MoveFile extends Command {
  static readonly args = {};
  static readonly description = 'Move a file into a destination folder.';
  static readonly aliases = ['move:file'];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];

  static readonly flags = {
    ...CLIUtils.CommonFlags,
    id: Flags.string({
      char: 'i',
      description: 'The file id to be moved.',
      required: false,
    }),
    destination: Flags.string({
      char: 'd',
      description: 'The destination folder id where the file is going to be moved.',
      required: false,
    }),
  };

  public async run() {
    const { flags } = await this.parse(MoveFile);

    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const fileUuid = await this.getFileUuid(flags['id'], nonInteractive);
    const destinationFolderUuid = await this.getDestinationFolderUuid(flags['destination'], nonInteractive);

    await DriveFileService.instance.moveFile({ fileUuid, destinationFolderUuid });
    CLIUtils.success(`File moved successfully to: ${destinationFolderUuid}`);
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
        name: MoveFile.flags['id'].name,
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

  public getDestinationFolderUuid = async (
    destinationFolderUuidFlag: string | undefined,
    nonInteractive: boolean,
  ): Promise<string> => {
    let destinationFolderUuid = CLIUtils.getValueFromFlag(
      {
        value: destinationFolderUuidFlag,
        name: MoveFile.flags['destination'].name,
        error: new NotValidFolderUuidError(),
        canBeEmpty: true,
      },
      nonInteractive,
      (folderUuid: string) => ValidationService.instance.validateUUIDv4(folderUuid),
    );
    if (!destinationFolderUuid) {
      destinationFolderUuid = (await this.getDestinationFolderUuidInteractively()).trim();
    }
    return destinationFolderUuid;
  };

  private static readonly MAX_ATTEMPTS = 3;

  public getFileUuidInteractively = (): Promise<string> => {
    return CLIUtils.promptWithAttempts(
      {
        message: 'What is the file id you want to move?',
        options: { required: true },
        error: new NotValidFileUuidError(),
      },
      MoveFile.MAX_ATTEMPTS,
      ValidationService.instance.validateUUIDv4,
    );
  };

  public getDestinationFolderUuidInteractively = (): Promise<string> => {
    return CLIUtils.promptWithAttempts(
      {
        message: 'What is the destination folder id?',
        options: { required: true },
        error: new NotValidFolderUuidError(),
      },
      MoveFile.MAX_ATTEMPTS,
      ValidationService.instance.validateUUIDv4,
    );
  };
}
