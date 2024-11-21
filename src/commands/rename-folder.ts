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
      description: 'The ID of the folder to be renamed.',
      required: false,
    }),
    name: Flags.string({
      char: 'n',
      description: 'The new name for the folder.',
      required: false,
    }),
  };
  static readonly enableJsonFlag = true;

  public run = async () => {
    const { flags } = await this.parse(RenameFolder);
    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const folderUuid = await this.getFolderUuid(flags['id'], nonInteractive);
    const name = await this.getFolderName(flags['name'], nonInteractive);

    await DriveFolderService.instance.renameFolder({ folderUuid, name });
    const message = `Folder renamed successfully with: ${name}`;
    CLIUtils.success(this.log.bind(this), message);
    return { success: true, message, folder: { uuid: folderUuid, plainName: name } };
  };

  public catch = async (error: Error) => {
    ErrorUtils.report(this.error.bind(this), error, { command: this.id });
    CLIUtils.error(this.log.bind(this), error.message);
    this.exit(1);
  };

  private getFolderUuid = async (folderUuidFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    const folderUuid = await CLIUtils.getValueFromFlag(
      {
        value: folderUuidFlag,
        name: RenameFolder.flags['id'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is the folder id you want to rename?',
          options: { type: 'input' },
        },
      },
      {
        validate: ValidationService.instance.validateUUIDv4,
        error: new NotValidFolderUuidError(),
      },
      this.log.bind(this),
    );
    return folderUuid;
  };

  private getFolderName = async (folderNameFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    const folderName = await CLIUtils.getValueFromFlag(
      {
        value: folderNameFlag,
        name: RenameFolder.flags['name'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is the new name of the folder?',
          options: { type: 'input' },
        },
      },
      {
        validate: ValidationService.instance.validateEmptyString,
        error: new EmptyFolderNameError(),
      },
      this.log.bind(this),
    );
    return folderName;
  };
}
