import { Command } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { ErrorUtils } from '../utils/errors.utils';
import { DriveDatabaseManager } from '../services/database/drive-database-manager.service';

export default class Logout extends Command {
  static readonly args = {};
  static readonly description = 'Logs out the current internxt user that is logged into the Internxt CLI.';
  static readonly aliases = [];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {};
  static readonly enableJsonFlag = true;

  public run = async () => {
    const user = await ConfigService.instance.readUser();
    if (user) {
      await ConfigService.instance.clearUser();
      await DriveDatabaseManager.clean();
      const message = 'User logged out successfully.';
      CLIUtils.success(this.log.bind(this), message);
      return { success: true, message };
    } else {
      const message = 'No user is currently logged in.';
      CLIUtils.error(this.log.bind(this), message);
      return { success: false, message };
    }
  };

  public catch = async (error: Error) => {
    ErrorUtils.report(this.error.bind(this), error, { command: this.id });
    CLIUtils.error(this.log.bind(this), error.message);
    this.exit(1);
  };
}
