import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { MissingCredentialsError } from '../types/command.types';
import { ErrorUtils } from '../utils/errors.utils';
import { TrashService } from '../services/drive/trash.service';
import { InquirerUtils } from '../utils/inquirer.utils';

export default class TrashClear extends Command {
  static readonly args = {};
  static readonly description = 'Deletes permanently all the content of the trash. This action cannot be undone.';
  static readonly aliases = ['trash:clear'];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {
    ...CLIUtils.CommonFlags,
    force: Flags.boolean({
      char: 'f',
      description: 'It forces the trash to be emptied without confirmation.',
      required: false,
    }),
  };
  static readonly enableJsonFlag = true;

  public run = async () => {
    const { flags } = await this.parse(TrashClear);

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    if (!flags.force) {
      if (flags['non-interactive']) {
        const message =
          'The "non interactive" flag is enabled, but the "force" flag has not been provided. User confirmation is required to empty the trash permanently.';
        CLIUtils.error(this.log.bind(this), message);
        return { success: false, message };
      }
      const confirmation = await this.getConfirmation();
      if (confirmation !== 'y') {
        const message = 'User confirmation is required to empty the trash permanently.';
        CLIUtils.error(this.log.bind(this), message);
        return { success: false, message };
      }
    }

    await TrashService.instance.clearTrash();
    const message = 'Trash emptied successfully.';
    CLIUtils.success(this.log.bind(this), message);
    return { success: true, message };
  };

  public catch = async (error: Error) => {
    ErrorUtils.report(this.error.bind(this), error, { command: this.id });
    CLIUtils.error(this.log.bind(this), error.message);
    this.exit(1);
  };

  private getConfirmation = async (): Promise<string> => {
    let confirmation = (await this.getConfirmationInteractively()).trim().toLowerCase();
    if (confirmation.length === 0) {
      confirmation = 'no';
    }
    return confirmation.charAt(0);
  };

  private getConfirmationInteractively = (): Promise<string> => {
    return InquirerUtils.prompt(
      'Empty trash? All items in the Drive Trash will be permanently deleted. This action cannot be undone.',
      {
        type: 'confirm',
        confirm: { default: false },
      },
    );
  };
}
