import { Args, Command, ux } from '@oclif/core';
import { PM2Utils } from '../utils/pm2.utils';
import { CLIUtils } from '../utils/cli.utils';
import { ConfigService } from '../services/config.service';
import { ErrorUtils } from '../utils/errors.utils';
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
    const { args } = await this.parse(Webdav);

    let message = '';
    let success = true;
    await PM2Utils.connect();
    switch (args.action) {
      case 'enable': {
        await AuthService.instance.getAuthDetails();
        message = await this.enableWebDav();
        break;
      }

      case 'disable': {
        message = await this.disableWebDav();
        break;
      }

      case 'restart': {
        await AuthService.instance.getAuthDetails();
        message = await this.restartWebDav();
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
    ErrorUtils.report(this.error.bind(this), error, { command: this.id });
    if (error instanceof Error) {
      CLIUtils.error(this.log.bind(this), error.message);
    } else {
      CLIUtils.error(this.log.bind(this), JSON.stringify(error));
    }
    this.exit(1);
  };

  private enableWebDav = async (): Promise<string> => {
    CLIUtils.doing('Starting Internxt WebDav server...');
    await PM2Utils.killWebDavServer();
    await PM2Utils.startWebDavServer();
    CLIUtils.done();
    const { status } = await PM2Utils.webdavServerStatus();
    const webdavConfigs = await ConfigService.instance.readWebdavConfig();

    if (status === 'online') {
      // eslint-disable-next-line max-len
      const message = `Internxt WebDav server started successfully at ${webdavConfigs.protocol}://${ConfigService.WEBDAV_LOCAL_URL}:${webdavConfigs.port}`;
      CLIUtils.log(this.log.bind(this), `\nWebDav server status: ${ux.colorize('green', 'online')}\n`);
      CLIUtils.success(this.log.bind(this), message);
      CLIUtils.log(
        this.log.bind(this),
        // eslint-disable-next-line max-len
        `\n[If the above URL is not working, the WebDAV server can be accessed directly via your localhost IP at: ${webdavConfigs.protocol}://127.0.0.1:${webdavConfigs.port} ]\n`,
      );
      return message;
    } else {
      const message = `WebDav server status: ${ux.colorize('red', status)}`;
      CLIUtils.log(this.log.bind(this), message);
      return message;
    }
  };

  private disableWebDav = async (): Promise<string> => {
    CLIUtils.doing('Stopping Internxt WebDav server...');
    await PM2Utils.killWebDavServer();
    CLIUtils.done();
    const message = 'Internxt WebDav server stopped successfully';
    CLIUtils.success(this.log.bind(this), message);
    return message;
  };

  private restartWebDav = async (): Promise<string> => {
    CLIUtils.doing('Restarting Internxt WebDav server...');
    const { status } = await PM2Utils.webdavServerStatus();
    if (status === 'online') {
      await PM2Utils.killWebDavServer();
      await PM2Utils.startWebDavServer();
      CLIUtils.done();
      const message = 'Internxt WebDav server restarted successfully';
      CLIUtils.success(this.log.bind(this), message);
      return message;
    } else {
      CLIUtils.done();
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
