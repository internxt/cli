import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { CLIUtils } from '../utils/cli.utils';
import { MissingCredentialsError, NotValidFolderUuidError } from '../types/command.types';
import { ValidationService } from '../services/validation.service';
import { ErrorUtils } from '../utils/errors.utils';

export default class TrashRestoreFolder extends Command {
  static readonly args = {};
  static readonly description = 'Restore a trashed folder into a destination folder.';
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly aliases = ['trash:restore:folder'];
  static readonly flags = {
    ...CLIUtils.CommonFlags,
    id: Flags.string({
      char: 'i',
      description: 'The folder id to be restored from the trash.',
      required: false,
    }),
    destination: Flags.string({
      char: 'd',
      description: 'The folder id where the folder is going to be restored. Leave empty for the root folder.',
      required: false,
      parse: CLIUtils.parseEmpty,
    }),
  };

  public async run() {
    const { flags } = await this.parse(TrashRestoreFolder);

    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const folderUuid = await this.getFolderUuid(flags['id'], nonInteractive);
    let destinationFolderUuid = await this.getDestinationFolderUuid(flags['destination'], nonInteractive);

    if (destinationFolderUuid.trim().length === 0) {
      // destinationFolderUuid is empty from flags&prompt, which means we should use RootFolderUuid
      destinationFolderUuid = userCredentials.root_folder_uuid;
    }

    await DriveFolderService.instance.moveFolder({ folderUuid, destinationFolderUuid });
    CLIUtils.success(`Folder restored successfully to: ${destinationFolderUuid}`);
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
        name: TrashRestoreFolder.flags['id'].name,
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

  public getDestinationFolderUuid = async (
    destinationFolderUuidFlag: string | undefined,
    nonInteractive: boolean,
  ): Promise<string> => {
    let destinationFolderUuid = CLIUtils.getValueFromFlag(
      {
        value: destinationFolderUuidFlag,
        name: TrashRestoreFolder.flags['destination'].name,
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

  public getFolderUuidInteractively = (): Promise<string> => {
    return CLIUtils.promptWithAttempts(
      {
        message: 'What is the folder id you want to restore?',
        options: { required: true },
        error: new NotValidFolderUuidError(),
      },
      TrashRestoreFolder.MAX_ATTEMPTS,
      ValidationService.instance.validateUUIDv4,
    );
  };

  public getDestinationFolderUuidInteractively = (): Promise<string> => {
    return CLIUtils.prompt({
      message: 'What is the destination folder id? (leave empty for the root folder)',
      options: { required: false },
    });
  };
}
