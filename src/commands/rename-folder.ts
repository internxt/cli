import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { EmptyFolderNameError, MissingCredentialsError, NotValidFolderUuidError } from '../types/command.types';
import { ValidationService } from '../services/validation.service';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { ErrorUtils } from '../utils/errors.utils';

export default class RenameFolder extends Command {
  static readonly args = {};
  static readonly description = 'Rename a folder.';
  static readonly aliases = ['rename:folder'];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];

  static readonly flags = {
    ...CLIUtils.CommonFlags,
    id: Flags.string({
      char: 'i',
      description: 'The ID of the folder to rename.',
      required: false,
    }),
    name: Flags.string({
      char: 'n',
      description: 'The new name for the folder.',
      required: false,
    }),
  };

  public async run() {
    const { flags } = await this.parse(RenameFolder);

    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const folderUuid = await this.getFolderUuid(flags['id'], nonInteractive);
    const name = await this.getNewName(flags['name'], nonInteractive);

    await DriveFolderService.instance.renameFolder({ folderUuid, name });
    CLIUtils.success(`Folder renamed successfully with: ${name}`);
  }

  async catch(error: Error) {
    ErrorUtils.report(error, { command: this.id });
    CLIUtils.error(error.message);
    this.exit(1);
  }

  public getFolderUuid = async (folderUuidFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    let folderUuid = CLIUtils.getValueFromFlag(
      {
        value: folderUuidFlag,
        name: RenameFolder.flags['id'].name,
        error: new NotValidFolderUuidError(),
        canBeEmpty: true,
      },
      nonInteractive,
      (folderUuid: string) => ValidationService.instance.validateUUIDv4(folderUuid),
    );
    if (!folderUuid) {
      folderUuid = (await this.getFolderUuidInteractively()).trim();
    }
    return folderUuid;
  };

  public getNewName = async (newNameUuidFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    let newName = CLIUtils.getValueFromFlag(
      {
        value: newNameUuidFlag,
        name: RenameFolder.flags['name'].name,
        error: new EmptyFolderNameError(),
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

  public getFolderUuidInteractively = (): Promise<string> => {
    return CLIUtils.promptWithAttempts(
      {
        message: 'What is the folder id you want to rename?',
        options: { required: true },
        error: new NotValidFolderUuidError(),
      },
      RenameFolder.MAX_ATTEMPTS,
      ValidationService.instance.validateUUIDv4,
    );
  };

  public getNewNameInteractively = (): Promise<string> => {
    return CLIUtils.promptWithAttempts(
      {
        message: 'What is the new name of the folder?',
        options: { required: false },
        error: new EmptyFolderNameError(),
      },
      RenameFolder.MAX_ATTEMPTS,
      (newName: string) => newName.trim().length > 0,
    );
  };
}
