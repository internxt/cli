import { Command, ux } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { ErrorUtils } from '../utils/errors.utils';
import { UsageService } from '../services/usage.service';
import { FormatUtils } from '../utils/format.utils';

export default class Config extends Command {
  static readonly args = {};
  static readonly description = 'Display useful information from the user logged into the Internxt CLI.';
  static readonly aliases = [];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {
    ...ux.table.flags(),
  };
  static readonly enableJsonFlag = true;

  public async run() {
    const { flags } = await this.parse(Config);
    const userCredentials = await ConfigService.instance.readUser();
    if (userCredentials?.user) {
      const usedSpace = FormatUtils.humanFileSize((await UsageService.instance.fetchUsage()).total);
      const availableSpace = FormatUtils.formatLimit(await UsageService.instance.fetchSpaceLimit());

      const configList = [
        { key: 'Email', value: userCredentials.user.email },
        { key: 'Root folder ID', value: userCredentials.user.rootFolderId },
        { key: 'Used space', value: usedSpace },
        { key: 'Available space', value: availableSpace },
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
      return { success: true, config: Object.fromEntries(configList.map(({ key, value }) => [key, value])) };
    } else {
      const message = 'You are not logged in.';
      CLIUtils.error(this.log.bind(this), message);
      return { success: false, message };
    }
  }

  async catch(error: Error) {
    ErrorUtils.report(this.error.bind(this), error, { command: this.id });
    CLIUtils.error(this.log.bind(this), error.message);
    this.exit(1);
  }
}
