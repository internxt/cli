import { Hook } from '@oclif/core';
import Whoami from '../../commands/whoami';
import { CLIUtils } from '../../utils/cli.utils';
import { SdkManager } from '../../services/sdk-manager.service';
import { AuthService } from '../../services/auth.service';

const CommandsToSkip = [Whoami];
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
      CLIUtils.error('Missing credentials, login first');
      opts.context.exit(1);
    }

    CLIUtils.done();
  }
};

export default hook;
