import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { MissingCredentialsError, NotValidFileUuidError } from '../types/command.types';
import { ValidationService } from '../services/validation.service';
import { ErrorUtils } from '../utils/errors.utils';
import { TrashService } from '../services/drive/trash.service';

export default class TrashFile extends Command {
  static readonly args = {};
  static readonly description = 'Moves a given file to the trash.';
  static readonly aliases = ['trash:file'];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];

  static readonly flags = {
    ...CLIUtils.CommonFlags,
    id: Flags.string({
      char: 'i',
      description: 'The file id to be trashed.',
      required: false,
    }),
  };

  public async run() {
    const { flags } = await this.parse(TrashFile);

    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const uuid = await this.getFileUuid(flags['id'], nonInteractive);

    await TrashService.instance.trashItems({ items: [{ uuid, type: 'file' }] });
    CLIUtils.success('File trashed successfully.');
  }

  async catch(error: Error) {
    ErrorUtils.report(error, { command: this.id });
    CLIUtils.error(error.message);
    this.exit(1);
  }

  public getFileUuid = async (fileUuidFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    let fileUuid = CLIUtils.getValueFromFlag(
      {
        value: fileUuidFlag,
        name: TrashFile.flags['id'].name,
        error: new NotValidFileUuidError(),
        canBeEmpty: true,
      },
      nonInteractive,
      (fileUuid: string) => ValidationService.instance.validateUUIDv4(fileUuid),
    );
    if (!fileUuid) {
      fileUuid = (await this.getFileUuidInteractively()).trim();
    }
    return fileUuid;
  };

  private static readonly MAX_ATTEMPTS = 3;

  public getFileUuidInteractively = (): Promise<string> => {
    return CLIUtils.promptWithAttempts(
      {
        message: 'What is the file id you want to trash?',
        options: { required: true },
        error: new NotValidFileUuidError(),
      },
      TrashFile.MAX_ATTEMPTS,
      ValidationService.instance.validateUUIDv4,
    );
  };
}
