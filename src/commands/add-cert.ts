import { Command } from '@oclif/core';
import { exec } from 'child_process';
import { ConfigService } from '../services/config.service';
import * as os from 'os';
import * as path from 'path';
import { CLIUtils } from '../utils/cli.utils';
import { ErrorUtils } from '../utils/errors.utils';

export default class AddCert extends Command {
  static readonly description = 'Add a self-signed certificate to the trusted store for macOS, Linux, and Windows.';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  public async run(): Promise<void> {
    try {
      const certPath = path.join(ConfigService.WEBDAV_SSL_CERTS_DIR, 'cert.crt');
      const platform = os.platform();

      const scriptBasePath = path.join(__dirname, '../../scripts');
      let command = '';

      if (platform === 'win32') {
        command = `powershell -ExecutionPolicy Bypass -File "${path.join(scriptBasePath, 'add-cert.ps1')}" -certPath "${certPath}"`;
      } else if (platform === 'darwin' || platform === 'linux') {
        command = `bash "${path.join(scriptBasePath, 'add-cert.sh')}" "${certPath}"`;
      } else {
        throw new Error(`Unsupported OS: ${platform}`);
      }

      await this.executeCommand(command);
      CLIUtils.success('Certificate successfully added to the trusted store.');
    } catch (error) {
      await this.catch(error as Error);
    }
  }

  async catch(error: Error) {
    ErrorUtils.report(error, { command: this.id });
    CLIUtils.error(error.message);
    this.exit(1);
  }

  private executeCommand(command: string): Promise<void> {
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
  }
}
