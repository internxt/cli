import { Command } from '@oclif/core';
import { ConfigService } from '../services/config.service';

export default class Logs extends Command {
  static readonly description = 'Displays the Internxt CLI logs directory path';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  public async run(): Promise<void> {
    this.log(`Internxt CLI logs are at ${ConfigService.INTERNXT_CLI_LOGS_DIR}`);
  }
}
