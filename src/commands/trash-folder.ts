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

  public async run() {
    const { flags } = await this.parse(TrashFolder);

    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const uuid = await this.getFolderUuid(flags['id'], nonInteractive);

    await TrashService.instance.trashItems({ items: [{ uuid, type: 'folder' }] });
    CLIUtils.success('Folder trashed successfully.');
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
        name: TrashFolder.flags['id'].name,
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

  private static readonly MAX_ATTEMPTS = 3;

  public getFolderUuidInteractively = (): Promise<string> => {
    return CLIUtils.promptWithAttempts(
      {
        message: 'What is the folder id you want to trash?',
        options: { required: true },
        error: new NotValidFolderUuidError(),
      },
      TrashFolder.MAX_ATTEMPTS,
      ValidationService.instance.validateUUIDv4,
    );
  };
}
