import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { CLIUtils } from '../utils/cli.utils';
import { MissingCredentialsError, NotValidFolderUuidError } from '../types/command.types';
import { ValidationService } from '../services/validation.service';

export default class MoveFolder extends Command {
  static readonly args = {};
  static readonly description = 'Move a folder into a destination folder.';
  static readonly aliases = ['move:folder'];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {
    ...CLIUtils.CommonFlags,
    id: Flags.string({
      char: 'i',
      description: 'The ID of the folder to be moved.',
      required: false,
    }),
    destination: Flags.string({
      char: 'd',
      description: 'The destination folder id where the folder is going to be moved. Leave empty for the root folder.',
      required: false,
      parse: CLIUtils.parseEmpty,
    }),
  };
  static readonly enableJsonFlag = true;

  public run = async () => {
    const { flags } = await this.parse(MoveFolder);
    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const folderUuid = await this.getFolderUuid(flags['id'], nonInteractive);
    let destinationFolderUuid = await this.getDestinationFolderUuid(flags['destination'], nonInteractive);
    if (destinationFolderUuid.trim().length === 0) {
      // destination id is empty from flags&prompt, which means we should use RootFolderUuid
      destinationFolderUuid = userCredentials.user.rootFolderId;
    }

    const newFolder = await DriveFolderService.instance.moveFolder(folderUuid, {
      destinationFolder: destinationFolderUuid,
    });
    const message = `Folder moved successfully to: ${destinationFolderUuid}`;
    CLIUtils.success(this.log.bind(this), message);
    return { success: true, message, folder: newFolder };
  };

  public catch = async (error: Error) => {
    const { flags } = await this.parse(MoveFolder);
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
        name: MoveFolder.flags['id'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is the folder id you want to move?',
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

  private getDestinationFolderUuid = async (
    destinationFolderUuidFlag: string | undefined,
    nonInteractive: boolean,
  ): Promise<string> => {
    const destinationFolderUuid = await CLIUtils.getValueFromFlag(
      {
        value: destinationFolderUuidFlag,
        name: MoveFolder.flags['destination'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is the destination folder id? (leave empty for the root folder)',
          options: { type: 'input' },
        },
      },
      {
        validate: ValidationService.instance.validateUUIDv4,
        error: new NotValidFolderUuidError(),
        canBeEmpty: true,
      },
      this.log.bind(this),
    );
    return destinationFolderUuid;
  };
}
