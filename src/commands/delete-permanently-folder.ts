import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { MissingCredentialsError, NotValidFolderUuidError } from '../types/command.types';
import { ValidationService } from '../services/validation.service';
import { TrashService } from '../services/drive/trash.service';
import { DriveFolderService } from '../services/drive/drive-folder.service';

export default class DeletePermanentlyFolder extends Command {
  static readonly args = {};
  static readonly description = 'Deletes permanently a folder. This action cannot be undone.';
  static readonly aliases = ['delete:permanently:folder'];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {
    ...CLIUtils.CommonFlags,
    id: Flags.string({
      char: 'i',
      description: 'The folder id to be permanently deleted.',
      required: false,
    }),
  };
  static readonly enableJsonFlag = true;

  public run = async () => {
    const { flags } = await this.parse(DeletePermanentlyFolder);

    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const folderUuid = await this.getFolderUuid(flags['id'], nonInteractive);
    const driveFolder = await DriveFolderService.instance.getFolderMetaByUuid(folderUuid);
    if (!driveFolder) {
      throw new Error('Folder not found');
    }

    await TrashService.instance.deleteFolder(driveFolder.id);
    const message = 'Folder permanently deleted successfully';
    CLIUtils.success(this.log.bind(this), message);
    return { success: true, message };
  };

  public catch = async (error: Error) => {
    const { flags } = await this.parse(DeletePermanentlyFolder);
    CLIUtils.catchError({
      error,
      command: this.id,
      logReporter: this.log.bind(this),
      errorReporter: this.error.bind(this),
      jsonFlag: flags['json'],
    });
    this.exit(1);
  };

  private getFolderUuid = async (folderUuidFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    const folderUuid = await CLIUtils.getValueFromFlag(
      {
        value: folderUuidFlag,
        name: DeletePermanentlyFolder.flags['id'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is the folder id you want to permanently delete? (This action cannot be undone)',
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
}
