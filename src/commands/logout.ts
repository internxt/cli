import { Command } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';

export default class Logout extends Command {
  static args = {};
  static description = 'Logs out the current internxt user that is logged into the Internxt CLI.';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  static flags = {};

  public async run(): Promise<void> {
    await ConfigService.instance.clearUser();
    CLIUtils.log('User logged out correctly');
  }

  async catch(error: Error) {
    CLIUtils.error(error.message);
    this.exit(1);
  }
}
