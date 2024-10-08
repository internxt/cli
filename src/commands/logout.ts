import { Command } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { ErrorUtils } from '../utils/errors.utils';
import { DriveDatabaseManager } from '../services/database/drive-database-manager.service';

export default class Logout extends Command {
  static readonly args = {};
  static readonly description = 'Logs out the current internxt user that is logged into the Internxt CLI.';

  static readonly examples = ['<%= config.bin %> <%= command.id %>'];

  static readonly flags = {};

  public async run(): Promise<void> {
    const user = await ConfigService.instance.readUser();
    if (user) {
      await ConfigService.instance.clearUser();
      await DriveDatabaseManager.clean();
      CLIUtils.success('User logged out correctly');
    } else {
      CLIUtils.error('You are not logged in');
    }
  }

  async catch(error: Error) {
    ErrorUtils.report(error, { command: this.id });
    CLIUtils.error(error.message);
    this.exit(1);
  }
}
