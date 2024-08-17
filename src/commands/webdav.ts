import { Args, Command, ux } from '@oclif/core';
import { PM2Utils } from '../utils/pm2.utils';
import { CLIUtils } from '../utils/cli.utils';
import { ConfigService } from '../services/config.service';
import { AnalyticsService } from '../services/analytics.service';
import { AuthService } from '../services/auth.service';
import { DriveDatabaseManager } from '../services/database/drive-database-manager.service';
export default class Webdav extends Command {
  static readonly description = 'Enable, disable, restart or get the status of the Internxt CLI WebDav server';

  static examples = [
    '<%= config.bin %> <%= command.id %> enable',
    '<%= config.bin %> <%= command.id %> disable',
    '<%= config.bin %> <%= command.id %> restart',
    '<%= config.bin %> <%= command.id %> status',
  ];

  static flags = {};

  static args = {
    action: Args.string({
      required: true,
      options: ['enable', 'disable', 'restart', 'status'],
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
      const authDetails = await AuthService.instance.getAuthDetails();
      await AnalyticsService.instance.track('WebDAVEnabled', { app: 'internxt-cli', userId: authDetails.user.uuid });
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

  public async restartWebDav() {
    CLIUtils.doing('Restarting Internxt WebDav server...');
    await DriveDatabaseManager.clean();
    await PM2Utils.connect();
    const { status } = await PM2Utils.webdavServerStatus();
    if (status === 'online') {
      await PM2Utils.killWebDavServer();
      await PM2Utils.startWebDavServer();
      CLIUtils.done();
      CLIUtils.success('Internxt WebDav server restarted successfully');
    } else {
      CLIUtils.done();
      CLIUtils.error('Internxt WebDav server is not running, cannot restart');
    }
  }

  public async webDAVStatus() {
    await PM2Utils.connect();
    const { status } = await PM2Utils.webdavServerStatus();
    this.log(`Internxt WebDAV server status: ${status}`);
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

        case 'restart': {
          await this.restartWebDav();
          break;
        }

        case 'status': {
          await this.webDAVStatus();
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
