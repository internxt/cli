import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { NotValidPortError } from '../types/command.types';
import { ValidationService } from '../services/validation.service';

export default class WebDAVConfig extends Command {
  static readonly args = {};
  static readonly description = 'Edit the configuration of the Internxt CLI WebDav server as the port or the protocol.';
  static readonly aliases = [];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {
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
  };
  static readonly enableJsonFlag = true;

  public run = async () => {
    const {
      flags: { host, port, http, https, timeout, createFullPath },
    } = await this.parse(WebDAVConfig);
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

    await ConfigService.instance.saveWebdavConfig(webdavConfig);
    const message = `On the next start, the WebDAV server will use the next config: ${JSON.stringify(webdavConfig)}`;
    CLIUtils.success(this.log.bind(this), message);
    return { success: true, message, config: webdavConfig };
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
}
