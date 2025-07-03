import { Command } from '@oclif/core';
import { exec } from 'child_process';
import { ConfigService } from '../services/config.service';
import os from 'node:os';
import path from 'node:path';
import { CLIUtils } from '../utils/cli.utils';

export default class AddCert extends Command {
  static readonly args = {};
  static readonly description = 'Add a self-signed certificate to the trusted store for macOS, Linux, and Windows.';
  static readonly aliases = [];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {};
  static readonly enableJsonFlag = true;

  public run = async () => {
    const certPath = path.join(ConfigService.WEBDAV_SSL_CERTS_DIR, 'cert.crt');
    const platform = os.platform();

    const scriptBasePath = path.join(__dirname, '../../scripts');
    let command = '';

    if (platform === 'win32') {
      // eslint-disable-next-line max-len
      command = `powershell -ExecutionPolicy Bypass -File "${path.join(scriptBasePath, 'add-cert.ps1')}" -certPath "${certPath}"`;
    } else if (platform === 'darwin' || platform === 'linux') {
      command = `bash "${path.join(scriptBasePath, 'add-cert.sh')}" "${certPath}"`;
    } else {
      throw new Error(`Unsupported OS: ${platform}`);
    }

    await this.executeCommand(command);
    const message = 'Certificate successfully added to the trusted store.';
    CLIUtils.success(this.log.bind(this), message);
    return { success: true, message };
  };

  public catch = async (error: Error) => {
    const { flags } = await this.parse(AddCert);
    CLIUtils.catchError({
      error,
      command: this.id,
      logReporter: this.log.bind(this),
      errorReporter: this.error.bind(this),
      jsonFlag: flags['json'],
    });
    this.exit(1);
  };

  private executeCommand = (command: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          this.log(stderr);
          reject(error);
        } else {
          this.log(stdout);
          resolve();
        }
      });
    });
  };
}
