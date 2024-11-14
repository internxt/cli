import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { MissingCredentialsError, NotValidFolderUuidError } from '../types/command.types';
import { ValidationService } from '../services/validation.service';
import { ErrorUtils } from '../utils/errors.utils';
import { TrashService } from '../services/drive/trash.service';

export default class TrashFolder extends Command {
  static readonly args = {};
  static readonly description = 'Moves a given folder to the trash.';
  static readonly aliases = ['trash:folder'];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {
    ...CLIUtils.CommonFlags,
    id: Flags.string({
      char: 'i',
      description: 'The folder id to be trashed.',
      required: false,
    }),
  };
  static readonly enableJsonFlag = true;

  public async run() {
    const { flags } = await this.parse(TrashFolder);

    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const uuid = await this.getFolderUuid(flags['id'], nonInteractive);

    await TrashService.instance.trashItems({ items: [{ uuid, type: 'folder' }] });
    const message = 'Folder trashed successfully.';
    CLIUtils.success(this.log.bind(this), message);
    return { success: true, message, folder: { uuid } };
  }

  async catch(error: Error) {
    ErrorUtils.report(this.error.bind(this), error, { command: this.id });
    CLIUtils.error(this.log.bind(this), error.message);
    this.exit(1);
  }

  public getFolderUuid = async (folderUuidFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    const folderUuid = await CLIUtils.getValueFromFlag(
      {
        value: folderUuidFlag,
        name: TrashFolder.flags['id'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is the folder id you want to trash?',
          options: { required: false },
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
