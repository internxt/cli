import { Command } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';

export default class Logs extends Command {
  static readonly args = {};
  static readonly description = 'Displays the Internxt CLI logs directory path';
  static readonly aliases = [];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {};
  static readonly enableJsonFlag = true;

  public run = async () => {
    const message = `Internxt CLI logs are located at ${ConfigService.INTERNXT_CLI_LOGS_DIR}`;
    CLIUtils.log(this.log.bind(this), message);
    return { success: true, message, path: ConfigService.INTERNXT_CLI_LOGS_DIR };
  };

  public catch = async (error: Error) => {
    const { flags } = await this.parse(Logs);
    CLIUtils.catchError({
      error,
      command: this.id,
      logReporter: this.log.bind(this),
      jsonFlag: flags['json'],
    });
    this.exit(1);
  };
}
