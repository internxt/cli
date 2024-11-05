import { Args, Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { ErrorUtils } from '../utils/errors.utils';
import { NotValidPortError } from '../types/command.types';
import { ValidationService } from '../services/validation.service';

export default class WebDAVConfig extends Command {
  static readonly description = 'Edit the configuration of the Internxt CLI WebDav server as the port or the protocol.';
  static readonly args = {
    action: Args.string({
      required: true,
      options: ['set-http', 'set-https', 'change-port'],
    }),
  };
  static readonly examples = [
    '<%= config.bin %> <%= command.id %> set-http',
    '<%= config.bin %> <%= command.id %> set-https',
    '<%= config.bin %> <%= command.id %> change-port',
  ];
  static readonly flags = {
    ...CLIUtils.CommonFlags,
    port: Flags.string({
      char: 'p',
      description: 'The new port that the WebDAV server is going to be have.',
      required: false,
    }),
  };

  public async run(): Promise<void> {
    const { args, flags } = await this.parse(WebDAVConfig);
    const nonInteractive = flags['non-interactive'];
    const webdavConfig = await ConfigService.instance.readWebdavConfig();

    if (args.action !== 'change-port' && flags['port']) {
      CLIUtils.warning('The port flag will be ignored; it can only be used with the "change-port" action.');
    }

    switch (args.action) {
      case 'set-http': {
        await ConfigService.instance.saveWebdavConfig({
          ...webdavConfig,
          protocol: 'http',
        });
        CLIUtils.success('On the next start, the WebDAV server will use HTTP.');
        break;
      }

      case 'set-https': {
        await ConfigService.instance.saveWebdavConfig({
          ...webdavConfig,
          protocol: 'https',
        });
        CLIUtils.success('On the next start, the WebDAV server will use HTTPS.');
        break;
      }

      case 'change-port': {
        const newPort = await this.getWebDAVPort(flags['port'], nonInteractive);
        await ConfigService.instance.saveWebdavConfig({
          ...webdavConfig,
          port: newPort,
        });
        CLIUtils.success('For the next start, the Webdav server will be served at the new port: ' + newPort);
        break;
      }
    }
  }

  async catch(error: Error) {
    ErrorUtils.report(error, { command: this.id });
    CLIUtils.error(error.message);
    this.exit(1);
  }

  private static readonly MAX_ATTEMPTS = 3;

  public getWebDAVPort = async (webdavPortFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    let port = CLIUtils.getValueFromFlag(
      {
        value: webdavPortFlag,
        name: WebDAVConfig.flags['port'].name,
        error: new NotValidPortError(),
        canBeEmpty: true,
      },
      nonInteractive,
      (port: string) => ValidationService.instance.validateTCPIntegerPort(port),
    );
    if (!port) {
      port = (await this.getNewWebDAVPortInteractively()).trim();
    }
    return port;
  };

  public getNewWebDAVPortInteractively = (): Promise<string> => {
    return CLIUtils.promptWithAttempts(
      {
        message: 'What is the new WebDAV server port?',
        options: { required: false },
        error: new NotValidPortError(),
      },
      WebDAVConfig.MAX_ATTEMPTS,
      (port: string) => ValidationService.instance.validateTCPIntegerPort(port),
    );
  };
}
