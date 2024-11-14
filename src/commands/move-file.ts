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

  public async run() {
    const { flags } = await this.parse(MoveFile);
    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const fileUuid = await this.getFileUuid(flags['id'], nonInteractive);
    let destinationFolderUuid = await this.getDestinationFolderUuid(flags['destination'], nonInteractive);
    if (destinationFolderUuid.trim().length === 0) {
      // destination id is empty from flags&prompt, which means we should use RootFolderUuid
      destinationFolderUuid = userCredentials.user.rootFolderId;
    }

    const newFile = await DriveFileService.instance.moveFile({ fileUuid, destinationFolderUuid });
    const message = `File moved successfully to: ${destinationFolderUuid}`;
    CLIUtils.success(this.log.bind(this), message);
    return { success: true, message, file: newFile };
  }

  async catch(error: Error) {
    ErrorUtils.report(this.error.bind(this), error, { command: this.id });
    CLIUtils.error(this.log.bind(this), error.message);
    this.exit(1);
  }

  public getFileUuid = async (fileUuidFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    const fileUuid = await CLIUtils.getValueFromFlag(
      {
        value: fileUuidFlag,
        name: MoveFile.flags['id'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is the file id you want to move?',
          options: { required: false },
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

  public getDestinationFolderUuid = async (
    destinationFolderUuidFlag: string | undefined,
    nonInteractive: boolean,
  ): Promise<string> => {
    const destinationFolderUuid = await CLIUtils.getValueFromFlag(
      {
        value: destinationFolderUuidFlag,
        name: MoveFile.flags['destination'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is the destination folder id? (leave empty for the root folder)',
          options: { required: false },
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
