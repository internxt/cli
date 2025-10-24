import { Hook } from '@oclif/core';
import Whoami from '../../commands/whoami';
import Login from '../../commands/login';
import Logout from '../../commands/logout';
import Logs from '../../commands/logs';
import { CLIUtils } from '../../utils/cli.utils';
import { SdkManager } from '../../services/sdk-manager.service';
import { AuthService } from '../../services/auth.service';
import Webdav from '../../commands/webdav';
import WebDAVConfig from '../../commands/webdav-config';

const CommandsToSkip = [Whoami, Login, Logout, Logs, Webdav, WebDAVConfig];
const hook: Hook<'prerun'> = async function (opts) {
  const { Command, argv } = opts;
  const jsonFlag = argv.includes('--json');

  if (!CommandsToSkip.map((command) => command.name).includes(Command.name)) {
    CLIUtils.doing('Checking credentials', jsonFlag);
    try {
      const { token } = await AuthService.instance.getAuthDetails();
      SdkManager.init({ token });
      CLIUtils.done(jsonFlag);
      CLIUtils.clearPreviousLine(jsonFlag);
    } catch (error) {
      const err = error as Error;
      CLIUtils.catchError({
        error: err,
        command: Command.id,
        logReporter: this.log.bind(this),
        jsonFlag,
      });
      opts.context.exit(1);
    }
  }
};

export default hook;
