import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { EmptyFileNameError, MissingCredentialsError, NotValidFileUuidError } from '../types/command.types';
import { ValidationService } from '../services/validation.service';
import { DriveFileService } from '../services/drive/drive-file.service';
import path from 'node:path';

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

  public run = async () => {
    const { flags } = await this.parse(RenameFile);
    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const fileUuid = await this.getFileUuid(flags['id'], nonInteractive);
    const fileName = await this.getFileName(flags['name'], nonInteractive);

    const pathInfo = path.parse(fileName);
    const newName = pathInfo.name;
    const newType = pathInfo.ext.replace('.', '');

    await DriveFileService.instance.renameFile(fileUuid, { plainName: newName, type: newType });
    const message = `File renamed successfully with: ${newName}${newType ? '.' + newType : ''}`;
    CLIUtils.success(this.log.bind(this), message);
    return { success: true, message, file: { uuid: fileUuid, plainName: newName, type: newType } };
  };

  public catch = async (error: Error) => {
    const { flags } = await this.parse(RenameFile);
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
        name: RenameFile.flags['id'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is the file id you want to rename?',
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

  private getFileName = async (fileNameFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    const fileName = await CLIUtils.getValueFromFlag(
      {
        value: fileNameFlag,
        name: RenameFile.flags['name'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is the new name of the file?',
          options: { type: 'input' },
        },
      },
      {
        validate: ValidationService.instance.validateStringIsNotEmpty,
        error: new EmptyFileNameError(),
      },
      this.log.bind(this),
    );
    return fileName;
  };
}
