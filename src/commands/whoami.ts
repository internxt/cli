import { Command } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { ErrorUtils } from '../utils/errors.utils';

export default class Whoami extends Command {
  static readonly args = {};
  static readonly description = 'Display the current user logged into the Internxt CLI.';
  static readonly aliases = [];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {};
  static readonly enableJsonFlag = true;

  public async run() {
    const userCredentials = await ConfigService.instance.readUser();
    if (userCredentials?.user?.email) {
      const message = `You are logged in with: ${userCredentials.user.email}.`;
      CLIUtils.success(this.log.bind(this), message);
      return { success: true, message, login: userCredentials };
    } else {
      const message = 'You are not logged in.';
      CLIUtils.error(this.log.bind(this), message);
      return { success: false, message };
    }
  }

  async catch(error: Error) {
    ErrorUtils.report(this.error.bind(this), error, { command: this.id });
    CLIUtils.error(this.log.bind(this), error.message);
    this.exit(1);
  }
}
