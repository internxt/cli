import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { MissingCredentialsError, NotValidFileUuidError } from '../types/command.types';
import { ValidationService } from '../services/validation.service';
import { DriveFileService } from '../services/drive/drive-file.service';

export default class MoveFile extends Command {
  static readonly args = {};
  static readonly description = 'Move a file into a destination folder.';
  static readonly aliases = ['move:file'];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {
    ...CLIUtils.CommonFlags,
    id: Flags.string({
      char: 'i',
      description: 'The ID of the file to be moved.',
      required: false,
    }),
    destination: Flags.string({
      char: 'd',
      description: 'The destination folder id where the file is going to be moved. Leave empty for the root folder.',
      required: false,
      parse: CLIUtils.parseEmpty,
    }),
  };
  static readonly enableJsonFlag = true;

  public run = async () => {
    const { flags } = await this.parse(MoveFile);
    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const fileUuid = await this.getFileUuid(flags['id'], nonInteractive);

    const destinationFolderUuidFromFlag = await CLIUtils.getDestinationFolderUuid({
      destinationFolderUuidFlag: flags['destination'],
      destinationFlagName: MoveFile.flags['destination'].name,
      nonInteractive,
      reporter: this.log.bind(this),
    });
    const destinationFolderUuid = await CLIUtils.fallbackToRootFolderIdIfEmpty(
      destinationFolderUuidFromFlag,
      userCredentials,
    );

    const newFile = await DriveFileService.instance.moveFile(fileUuid, { destinationFolder: destinationFolderUuid });
    const message = `File moved successfully to: ${destinationFolderUuid}`;
    CLIUtils.success(this.log.bind(this), message);
    return { success: true, message, file: newFile };
  };

  public catch = async (error: Error) => {
    const { flags } = await this.parse(MoveFile);
    CLIUtils.catchError({
      error,
      command: this.id,
      logReporter: this.log.bind(this),
      jsonFlag: flags['json'],
    });
    this.exit(1);
  };

  private getFileUuid = async (fileUuidFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    const fileUuid = await CLIUtils.getValueFromFlag(
      {
        value: fileUuidFlag,
        name: MoveFile.flags['id'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is the file id you want to move?',
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
