import { Args, Command, ux } from '@oclif/core';
import { PM2Utils } from '../utils/pm2.utils';
import { CLIUtils } from '../utils/cli.utils';
import { ConfigService } from '../services/config.service';
import { AnalyticsService } from '../services/analytics.service';
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
        `Internxt WebDav server started successfully on https://${ConfigService.WEBDAV_LOCAL_URL}:${process.env.WEBDAV_SERVER_PORT}`,
      );
      await AnalyticsService.instance.track('WebDAVEnabled', { app: 'internxt-cli' });
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
      if (error instanceof Error) {
        CLIUtils.error(error.message);
      } else {
        CLIUtils.error(JSON.stringify(error));
      }
    }

    this.exit(0);
  }
}
