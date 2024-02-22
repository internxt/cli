import { Command } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';

export default class Whoami extends Command {
  static readonly args = {};
  static readonly description = 'Displays the current user logged into the Internxt CLI.';

  static readonly examples = ['<%= config.bin %> <%= command.id %>'];

  static readonly flags = {};

  public async run(): Promise<void> {
    const userCredentials = await ConfigService.instance.readUser();
    if (userCredentials?.user?.email) {
      CLIUtils.success(`You are logged in with: ${userCredentials.user.email}`);
    } else {
      CLIUtils.success('You are not logged in');
    }
  }
}
