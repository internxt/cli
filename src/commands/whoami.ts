import { Command } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';

export default class Whoami extends Command {
  static args = {};
  static description = 'Displays the current user logged into the Internxt CLI.';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  static flags = {};

  public async run(): Promise<void> {
    const userCredentials = await ConfigService.instance.readUser();
    if (userCredentials?.user?.email) {
      CLIUtils.log(`You are logged in with: ${userCredentials.user.email}`);
    } else {
      CLIUtils.log('You are not logged in');
    }
  }
}
