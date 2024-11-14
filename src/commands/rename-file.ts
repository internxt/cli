import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { EmptyFileNameError, MissingCredentialsError, NotValidFileUuidError } from '../types/command.types';
import { ValidationService } from '../services/validation.service';
import { DriveFileService } from '../services/drive/drive-file.service';
import { ErrorUtils } from '../utils/errors.utils';

export default class RenameFile extends Command {
  static readonly args = {};
  static readonly description = 'Rename a file.';
  static readonly aliases = ['rename:file'];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {
    ...CLIUtils.CommonFlags,
    id: Flags.string({
      char: 'i',
      description: 'The ID of the file to be renamed.',
      required: false,
    }),
    name: Flags.string({
      char: 'n',
      description: 'The new name for the file.',
      required: false,
    }),
  };
  static readonly enableJsonFlag = true;

  public async run() {
    const { flags } = await this.parse(RenameFile);
    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const fileUuid = await this.getFileUuid(flags['id'], nonInteractive);
    const newName = await this.getFileName(flags['name'], nonInteractive);

    await DriveFileService.instance.renameFile(fileUuid, { plainName: newName });
    const message = `File renamed successfully with: ${newName}`;
    CLIUtils.success(this.log.bind(this), message);
    return { success: true, message, file: { uuid: fileUuid, plainName: newName } };
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
        name: RenameFile.flags['id'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is the file id you want to rename?',
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

  public getFileName = async (fileNameFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    const fileName = await CLIUtils.getValueFromFlag(
      {
        value: fileNameFlag,
        name: RenameFile.flags['name'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is the new name of the file?',
          options: { required: false },
        },
      },
      {
        validate: ValidationService.instance.validateEmptyString,
        error: new EmptyFileNameError(),
      },
      this.log.bind(this),
    );
    return fileName;
  };
}
