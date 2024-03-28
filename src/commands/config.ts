import { Command, ux } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { ErrorUtils } from '../utils/errors.utils';
import { UsageService } from '../services/usage.service';
import { FormatUtils } from '../utils/format.utils';

export default class Config extends Command {
  static readonly args = {};
  static readonly description = 'Display useful information from the user logged into the Internxt CLI.';

  static readonly examples = ['<%= config.bin %> <%= command.id %>'];

  static readonly flags = {
    ...ux.table.flags(),
  };

  async catch(error: Error) {
    ErrorUtils.report(error, { command: this.id });
    CLIUtils.error(error.message);
    this.exit(1);
  }

  public async run(): Promise<void> {
    const { flags } = await this.parse(Config);
    const userCredentials = await ConfigService.instance.readUser();
    if (userCredentials?.user) {
      const configList = [
        { key: 'Email', value: userCredentials.user.email },
        { key: 'Root folder ID', value: userCredentials.root_folder_uuid },
        { key: 'Used space', value: FormatUtils.humanFileSize(await UsageService.instance.fetchTotalUsage()) },
        { key: 'Available space', value: FormatUtils.formatLimit(await UsageService.instance.fetchSpaceLimit()) },
      ];
      ux.table(
        configList,
        {
          key: {
            header: 'Key',
            get: (row) => row.key,
          },
          value: {
            header: 'Value',
            get: (row) => row.value,
          },
        },
        {
          printLine: this.log.bind(this),
          ...flags,
        },
      );
    } else {
      CLIUtils.error('You are not logged in');
    }
  }
}
