import { Command } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { UsageService } from '../services/usage.service';
import { FormatUtils } from '../utils/format.utils';
import { Header } from 'tty-table';

export default class Config extends Command {
  static readonly args = {};
  static readonly description = 'Display useful information from the user logged into the Internxt CLI.';
  static readonly aliases = [];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {};
  static readonly enableJsonFlag = true;

  public run = async () => {
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
      const header: Header[] = [
        { value: 'key', alias: 'Key' },
        { value: 'value', alias: 'Value' },
      ];
      CLIUtils.table(this.log.bind(this), header, configList);

      return { success: true, config: Object.fromEntries(configList.map(({ key, value }) => [key, value])) };
    } else {
      const message = 'You are not logged in.';
      CLIUtils.error(this.log.bind(this), message);
      return { success: false, message };
    }
  };

  public catch = async (error: Error) => {
    const { flags } = await this.parse(Config);
    CLIUtils.catchError({
      error,
      command: this.id,
      logReporter: this.log.bind(this),
      errorReporter: this.error.bind(this),
      jsonFlag: flags['json'],
    });
    this.exit(1);
  };
}
