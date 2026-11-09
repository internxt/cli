import { Hook, ux } from '@oclif/core';
import Logout from '../../commands/logout';
import Logs from '../../commands/logs';
import Webdav from '../../commands/webdav';
import WebDAVConfig from '../../commands/webdav-config';
import { ClientCompatibilityService } from '../../services/client-compatibility.service';
import { CLIUtils } from '../../utils/cli.utils';

const ALLOWED_COMMANDS = new Set<unknown>([Logout, Logs, WebDAVConfig]);
const ALLOWED_PLUGIN_COMMANDS = ['help', 'autocomplete'];
const ALLOWED_WEBDAV_ACTIONS = new Set(['disable', 'stop', 'status']);

export const isAllowedWhenUnsupported = (command: { id?: string }, argv: string[]): boolean => {
  const id = command.id?.toLowerCase();
  if (!id || ALLOWED_COMMANDS.has(command)) return true;
  if (ALLOWED_PLUGIN_COMMANDS.some((plugin) => id === plugin || id.startsWith(`${plugin}:`))) return true;
  return command === Webdav && argv.some((arg) => ALLOWED_WEBDAV_ACTIONS.has(arg.toLowerCase()));
};

const hook: Hook<'prerun'> = async function ({ Command, argv }) {
  if (isAllowedWhenUnsupported(Command, argv)) return;

  const { blockError, warning } = await ClientCompatibilityService.instance.evaluate();
  if (blockError) {
    CLIUtils.catchError({
      error: blockError,
      command: Command.id,
      logReporter: this.log.bind(this),
      jsonFlag: argv.includes('--json'),
    });
    this.exit(1);
  }
  if (warning) CLIUtils.warning((line) => ux.stderr(line), warning);
};

export default hook;
