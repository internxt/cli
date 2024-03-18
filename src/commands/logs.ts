import { Command } from '@oclif/core';
import { ConfigService } from '../services/config.service';

export default class Logs extends Command {
  static description = 'describe the command here';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  static flags = {};

  static args = {};

  public async run(): Promise<void> {
    this.log(`Internxt CLI logs are at ${ConfigService.INTERNXT_CLI_LOGS_DIR}`);
  }
}
