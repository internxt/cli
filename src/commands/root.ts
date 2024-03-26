import { Command } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { ErrorUtils } from '../utils/errors.utils';
import { ValidationService } from '../services/validation.service';

export default class Root extends Command {
  static readonly args = {};
  static readonly description = 'Display the current root folder id from the user logged into the Internxt CLI.';

  static readonly examples = ['<%= config.bin %> <%= command.id %>'];

  static readonly flags = {};

  async catch(error: Error) {
    ErrorUtils.report(error, { command: this.id });
    CLIUtils.error(error.message);
    this.exit(1);
  }

  public async run(): Promise<void> {
    const userCredentials = await ConfigService.instance.readUser();
    if (
      userCredentials?.user &&
      userCredentials.root_folder_uuid &&
      ValidationService.instance.validateUUIDv4(userCredentials.root_folder_uuid)
    ) {
      CLIUtils.success(`Your root folder id is: ${userCredentials.root_folder_uuid}`);
    } else {
      CLIUtils.error('You are not logged in');
    }
  }
}
