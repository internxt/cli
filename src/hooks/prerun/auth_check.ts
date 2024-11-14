import { Hook } from '@oclif/core';
import Whoami from '../../commands/whoami';
import Login from '../../commands/login';
import Logout from '../../commands/logout';
import Logs from '../../commands/logs';
import { CLIUtils } from '../../utils/cli.utils';
import { SdkManager } from '../../services/sdk-manager.service';
import { AuthService } from '../../services/auth.service';
import { MissingCredentialsError } from '../../types/command.types';
import Webdav from '../../commands/webdav';
import WebDAVConfig from '../../commands/webdav-config';

const CommandsToSkip = [Whoami, Login, Logout, Logs, Webdav, WebDAVConfig];
const hook: Hook<'prerun'> = async function (opts) {
  if (!CommandsToSkip.map((command) => command.name).includes(opts.Command.name)) {
    CLIUtils.doing('Checking credentials');
    try {
      const { token, newToken } = await AuthService.instance.getAuthDetails();
      SdkManager.init({
        token,
        newToken,
      });
    } catch (error) {
      CLIUtils.error(this.log.bind(this), new MissingCredentialsError().message);
      opts.context.exit(1);
    }
    CLIUtils.done();
    CLIUtils.clearPreviousLine();
  }
};

export default hook;
