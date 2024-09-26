import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { MissingCredentialsError, NotValidYesOrNoError } from '../types/command.types';
import { ErrorUtils } from '../utils/errors.utils';
import { TrashService } from '../services/drive/trash.service';
import { ValidationService } from '../services/validation.service';

export default class TrashClear extends Command {
  static readonly args = {};
  static readonly description = 'Deletes permanently all the content of the trash. This action cannot be undone.';
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly aliases = ['trash:clear', 'trash:clean', 'trash:empty'];
  static readonly flags = {
    ...CLIUtils.CommonFlags,
    force: Flags.boolean({
      char: 'f',
      description: 'It forces the trash to be emptied without confirmation.',
      required: false,
    }),
  };

  public async run() {
    const { flags } = await this.parse(TrashClear);

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    if (!flags.force) {
      if (flags['non-interactive']) {
        CLIUtils.error(
          'The "non interactive" flag is enabled, but the "force" flag has not been provided. User confirmation is required to empty the trash permanently.',
        );
        return;
      }
      const confirmation = await this.getConfirmation();
      if (confirmation !== 'y') {
        CLIUtils.error('User confirmation is required to empty the trash permanently.');
        return;
      }
    }

    await TrashService.instance.clearTrash();
    CLIUtils.success('Trash emptied correctly');
  }

  async catch(error: Error) {
    ErrorUtils.report(error, { command: this.id });
    CLIUtils.error(error.message);
    this.exit(1);
  }

  public getConfirmation = async (): Promise<string> => {
    let confirmation = (await this.getConfirmationInteractively()).trim().toLowerCase();
    if (confirmation.length === 0) {
      confirmation = 'no';
    }

    if (!ValidationService.instance.validateYesOrNoString(confirmation)) {
      throw new NotValidYesOrNoError();
    }
    return confirmation.charAt(0);
  };

  public getConfirmationInteractively = (): Promise<string> => {
    return CLIUtils.prompt({
      message:
        'Empty trash? All items in the Drive Trash will be permanently deleted. This action cannot be undone. [y/N]',
      options: { required: false },
    });
  };
}
