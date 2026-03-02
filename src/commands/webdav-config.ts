import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import {
  EmptyCustomAuthUsernameError,
  MissingCredentialsWhenUsingAuthError,
  NotValidPortError,
  EmptyCustomAuthPasswordError,
} from '../types/command.types';
import { ValidationService } from '../services/validation.service';

export default class WebDAVConfig extends Command {
  static readonly args = {};
  static readonly description = 'Edit the configuration of the Internxt CLI WebDav server as the port or the protocol.';
  static readonly aliases = [];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {
    ...CLIUtils.CommonFlags,
    host: Flags.string({
      char: 'l',
      description: 'The listening host for the WebDAV server.',
      required: false,
    }),
    port: Flags.string({
      char: 'p',
      description: 'The new port for the WebDAV server.',
      required: false,
    }),
    https: Flags.boolean({
      char: 's',
      description: 'Configures the WebDAV server to use HTTPS with self-signed certificates.',
      required: false,
      exclusive: ['http'],
    }),
    http: Flags.boolean({
      char: 'h',
      description: 'Configures the WebDAV server to use insecure plain HTTP.',
      required: false,
      exclusive: ['https'],
    }),
    timeout: Flags.integer({
      char: 't',
      description: 'Configures the WebDAV server to use this timeout in minutes.',
      required: false,
      min: 0,
    }),
    createFullPath: Flags.boolean({
      char: 'c',
      description: 'Auto-create missing parent directories during file uploads.',
      required: false,
      allowNo: true,
    }),
    customAuth: Flags.boolean({
      char: 'a',
      description: 'Configures the WebDAV server to use custom authentication.',
      required: false,
      default: undefined,
      allowNo: true,
    }),
    username: Flags.string({
      char: 'u',
      description: 'Configures the WebDAV server to use this username for custom authentication.',
      required: false,
    }),
    password: Flags.string({
      char: 'w',
      description: 'Configures the WebDAV server to use this password for custom authentication.',
      required: false,
    }),
  };
  static readonly enableJsonFlag = true;

  public run = async () => {
    const { flags } = await this.parse(WebDAVConfig);
    const { host, port, https, http, timeout, createFullPath, customAuth, username, password } = flags;
    const nonInteractive = flags['non-interactive'];

    const webdavConfig = await ConfigService.instance.readWebdavConfig();

    if (host) {
      webdavConfig['host'] = host;
    }

    if (port) {
      if (ValidationService.instance.validateTCPIntegerPort(port)) {
        webdavConfig['port'] = port;
      } else {
        throw new NotValidPortError();
      }
    }

    if (http) {
      webdavConfig['protocol'] = 'http';
    }

    if (https) {
      webdavConfig['protocol'] = 'https';
    }

    if (timeout !== undefined) {
      webdavConfig['timeoutMinutes'] = timeout;
    }

    if (createFullPath !== undefined) {
      webdavConfig['createFullPath'] = createFullPath;
    }

    if (customAuth !== undefined) {
      webdavConfig['customAuth'] = customAuth;
    }
    if (username) {
      webdavConfig['username'] = await this.getUsername(username, nonInteractive);
    }
    if (password) {
      webdavConfig['password'] = await this.getPassword(password, nonInteractive);
    }
    if (webdavConfig['customAuth'] && (!webdavConfig['username'] || !webdavConfig['password'])) {
      throw new MissingCredentialsWhenUsingAuthError();
    }

    await ConfigService.instance.saveWebdavConfig(webdavConfig);

    const printWebdavConfig = {
      ...webdavConfig,
      password: undefined,
    };

    const message =
      'On the next start, the WebDAV server will use the next config: ' + JSON.stringify(printWebdavConfig);
    CLIUtils.success(this.log.bind(this), message);
    return { success: true, message, config: printWebdavConfig };
  };

  public catch = async (error: Error) => {
    const { flags } = await this.parse(WebDAVConfig);
    CLIUtils.catchError({
      error,
      command: this.id,
      logReporter: this.log.bind(this),
      jsonFlag: flags['json'],
    });
    this.exit(1);
  };

  private getUsername = async (usernameFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    const username = await CLIUtils.getValueFromFlag(
      {
        value: usernameFlag,
        name: WebDAVConfig.flags['username'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is the custom auth username?',
          options: { type: 'input' },
        },
      },
      {
        validate: ValidationService.instance.validateStringIsNotEmpty,
        error: new EmptyCustomAuthUsernameError(),
      },
      this.log.bind(this),
    );
    return username;
  };

  private getPassword = async (passwordFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    const password = await CLIUtils.getValueFromFlag(
      {
        value: passwordFlag,
        name: WebDAVConfig.flags['password'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is the custom auth password?',
          options: { type: 'password' },
        },
      },
      {
        validate: ValidationService.instance.validateStringIsNotEmpty,
        error: new EmptyCustomAuthPasswordError(),
      },
      this.log.bind(this),
    );
    return password;
  };
}
