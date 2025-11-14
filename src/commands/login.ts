import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { SdkManager } from '../services/sdk-manager.service';
import { UniversalLinkService } from '../services/universal-link.service';

export default class Login extends Command {
  static readonly args = {};
  static readonly description =
    'Logs into your Internxt account using the web-based login flow. ' +
    'A temporary local server is started to securely receive the authentication response.';
  static readonly aliases = [];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {
    host: Flags.string({
      char: 'h',
      aliases: ['host'],
      env: 'INXT_LOGIN_SERVER_HOST',
      description:
        'IP address of the machine where the CLI is running. ' +
        'If you are opening the login page in a browser on another device, ' +
        'set this to the IP address of the machine running the CLI. Defaults to 127.0.0.1.',
      required: false,
    }),
    port: Flags.integer({
      char: 'p',
      aliases: ['port'],
      env: 'INXT_LOGIN_SERVER_PORT',
      description:
        'Port used by the temporary local server to handle the login callback. ' +
        'If not specified, a random available port will be used automatically.',
      required: false,
    }),
  };
  static readonly enableJsonFlag = true;

  public run = async () => {
    const { flags } = await this.parse(Login);

    const host = flags['host'];
    const port = flags['port'];
    const loginCredentials = await UniversalLinkService.instance.loginSSO(
      flags['json'] ?? false,
      this.log.bind(this),
      host,
      port,
    );

    SdkManager.init({ token: loginCredentials.token });

    await ConfigService.instance.saveUser(loginCredentials);
    const message = `Succesfully logged in to: ${loginCredentials.user.email}`;
    CLIUtils.success(this.log.bind(this), message);
    return {
      success: true,
      message,
      login: loginCredentials,
    };
  };

  public catch = async (error: Error) => {
    const { flags } = await this.parse(Login);
    CLIUtils.catchError({
      error,
      command: this.id,
      logReporter: this.log.bind(this),
      jsonFlag: flags['json'],
    });
    this.exit(1);
  };
}
