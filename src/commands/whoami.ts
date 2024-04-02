import { Command } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { ErrorUtils } from '../utils/errors.utils';

export default class Whoami extends Command {
  static readonly args = {};
  static readonly description = 'Display the current user logged into the Internxt CLI.';

  static readonly examples = ['<%= config.bin %> <%= command.id %>'];

  static readonly flags = {};

  async catch(error: Error) {
    ErrorUtils.report(error, { command: this.id });
    CLIUtils.error(error.message);
    this.exit(1);
  }

  public async run(): Promise<void> {
    const userCredentials = await ConfigService.instance.readUser();
    if (userCredentials?.user?.email) {
      CLIUtils.success(`You are logged in with: ${userCredentials.user.email}`);
    } else {
      CLIUtils.error('You are not logged in');
    }
  }
}
