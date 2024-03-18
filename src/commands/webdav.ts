import { Args, Command, ux } from '@oclif/core';
import { PM2Utils } from '../utils/pm2.utils';
import { CLIUtils } from '../utils/cli.utils';
import { CommandError } from '@oclif/core/lib/interfaces';
export default class Webdav extends Command {
  static readonly description = 'Enable or disable the Internxt CLI WebDav server';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  static flags = {};

  static args = {
    action: Args.string({
      required: true,
      options: ['enable', 'disable'],
    }),
  };
  public async enableWebDav() {
    CLIUtils.doing('Starting Internxt WebDav server...');
    await PM2Utils.connect();
    await PM2Utils.killWebDavServer();
    await PM2Utils.startWebDavServer();
    CLIUtils.done();
    const { status } = await PM2Utils.webdavServerStatus();

    if (status === 'online') {
      ux.log(`\nWebDav server status: ${ux.colorize('green', 'online')}\n`);
      CLIUtils.success(
        `Internxt WebDav server started successfully on http://webdav.local.internxt.com:${process.env.WEBDAV_SERVER_PORT}`,
      );
    } else {
      ux.log(`WebDav server status: ${ux.colorize('red', status)}`);
    }
  }

  public async disableWebDav() {
    CLIUtils.doing('Stopping Internxt WebDav server...');
    await PM2Utils.connect();
    await PM2Utils.killWebDavServer();
    CLIUtils.done();
    CLIUtils.success('Internxt WebDav server stopped successfully');
  }

  public async run(): Promise<void> {
    const { args } = await this.parse(Webdav);

    try {
      switch (args.action) {
        case 'enable': {
          await this.enableWebDav();
          break;
        }

        case 'disable': {
          await this.disableWebDav();
          break;
        }
      }
    } catch (error) {
      CLIUtils.error(error as any);
    }

    this.exit(0);
  }
}
