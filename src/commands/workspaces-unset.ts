import { Command } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { LoginCredentials, MissingCredentialsError } from '../types/command.types';
import { SdkManager } from '../services/sdk-manager.service';

export default class WorkspacesUnset extends Command {
  static readonly args = {};
  static readonly description =
    'Unset the active workspace context for the current user session. ' +
    'Once a workspace is unset, all subsequent commands (list, upload, download, etc.) ' +
    'will operate within the personal drive space until it is changed or set again.';
  static readonly aliases = ['workspaces:unset'];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {
    ...CLIUtils.CommonFlags,
  };
  static readonly enableJsonFlag = true;

  public run = async () => {
    await this.parse(WorkspacesUnset);

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    return WorkspacesUnset.unsetWorkspace(userCredentials, this.log.bind(this));
  };

  public catch = async (error: Error) => {
    const { flags } = await this.parse(WorkspacesUnset);
    CLIUtils.catchError({
      error,
      command: this.id,
      logReporter: this.log.bind(this),
      jsonFlag: flags['json'],
    });
    this.exit(1);
  };

  static readonly unsetWorkspace = async (userCredentials: LoginCredentials, reporter: (message: string) => void) => {
    SdkManager.init({ token: userCredentials.token });
    await ConfigService.instance.saveUser({ ...userCredentials, workspace: undefined });
    CLIUtils.success(reporter, 'Personal drive space selected successfully.');
    return { success: true, message: 'Personal drive space selected successfully.' };
  };
}
