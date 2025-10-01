import { Args, Command, ux } from '@oclif/core';
import { PM2Utils } from '../utils/pm2.utils';
import { CLIUtils } from '../utils/cli.utils';
import { ConfigService } from '../services/config.service';
import { AuthService } from '../services/auth.service';

export default class Webdav extends Command {
  static readonly args = {
    action: Args.string({
      required: true,
      options: ['enable', 'disable', 'restart', 'status'],
    }),
  };
  static readonly description = 'Enable, disable, restart or get the status of the Internxt CLI WebDav server';
  static readonly aliases = [];
  static readonly examples = [
    '<%= config.bin %> <%= command.id %> enable',
    '<%= config.bin %> <%= command.id %> disable',
    '<%= config.bin %> <%= command.id %> restart',
    '<%= config.bin %> <%= command.id %> status',
  ];
  static readonly flags = {};
  static readonly enableJsonFlag = true;

  public run = async () => {
    const { args, flags } = await this.parse(Webdav);

    let message = '';
    let success = true;
    await PM2Utils.connect();
    switch (args.action) {
      case 'enable': {
        await AuthService.instance.getAuthDetails();
        message = await this.enableWebDav(flags['json']);
        break;
      }

      case 'disable': {
        message = await this.disableWebDav(flags['json']);
        break;
      }

      case 'restart': {
        await AuthService.instance.getAuthDetails();
        message = await this.restartWebDav(flags['json']);
        break;
      }

      case 'status': {
        await AuthService.instance.getAuthDetails();
        message = await this.webDAVStatus();
        break;
      }

      default: {
        success = false;
        message = `Expected one of this command actions: ${Webdav.args.action.options}`;
        break;
      }
    }
    PM2Utils.disconnect();
    return { success, message, action: args.action };
  };

  public catch = async (error: Error) => {
    const { flags } = await this.parse(Webdav);
    CLIUtils.catchError({
      error,
      command: this.id,
      logReporter: this.log.bind(this),
      errorReporter: this.error.bind(this),
      jsonFlag: flags['json'],
    });
    this.exit(1);
  };

  private enableWebDav = async (jsonFlag?: boolean): Promise<string> => {
    CLIUtils.doing('Starting Internxt WebDav server...', jsonFlag);
    await PM2Utils.killWebDavServer();
    await PM2Utils.startWebDavServer();
    CLIUtils.done(jsonFlag);
    const { status } = await PM2Utils.webdavServerStatus();
    const webdavConfigs = await ConfigService.instance.readWebdavConfig();

    if (status === 'online') {
      const message =
        'Internxt WebDav server started successfully at ' +
        `${webdavConfigs.protocol}://${webdavConfigs.host}:${webdavConfigs.port}`;
      CLIUtils.log(this.log.bind(this), `\nWebDav server status: ${ux.colorize('green', 'online')}\n`);
      CLIUtils.success(this.log.bind(this), message);
      return message;
    } else {
      const message = `WebDav server status: ${ux.colorize('red', status)}`;
      CLIUtils.log(this.log.bind(this), message);
      return message;
    }
  };

  private disableWebDav = async (jsonFlag?: boolean): Promise<string> => {
    CLIUtils.doing('Stopping Internxt WebDav server...', jsonFlag);
    await PM2Utils.killWebDavServer();
    CLIUtils.done(jsonFlag);
    const message = 'Internxt WebDav server stopped successfully';
    CLIUtils.success(this.log.bind(this), message);
    return message;
  };

  private restartWebDav = async (jsonFlag?: boolean): Promise<string> => {
    CLIUtils.doing('Restarting Internxt WebDav server...', jsonFlag);
    const { status } = await PM2Utils.webdavServerStatus();
    if (status === 'online') {
      await PM2Utils.killWebDavServer();
      await PM2Utils.startWebDavServer();
      CLIUtils.done(jsonFlag);
      const message = 'Internxt WebDav server restarted successfully';
      CLIUtils.success(this.log.bind(this), message);
      return message;
    } else {
      CLIUtils.done(jsonFlag);
      const message = 'Internxt WebDav server is not running, it wont be restarted';
      CLIUtils.warning(this.log.bind(this), message);
      return message;
    }
  };

  private webDAVStatus = async (): Promise<string> => {
    const { status } = await PM2Utils.webdavServerStatus();
    const message = `Internxt WebDAV server status: ${status}`;
    CLIUtils.log(this.log.bind(this), message);
    return message;
  };
}
