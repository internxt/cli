import { Hook, ux } from '@oclif/core';
import { ClientCompatibilityService } from '../../services/client-compatibility.service';
import { CLIUtils } from '../../utils/cli.utils';

const ALLOWED_COMMANDS = new Set(['logout', 'logs', 'help', 'webdav-config']);
const ALLOWED_WEBDAV_ACTIONS = new Set(['disable', 'stop', 'status']);

export const isAllowedWhenUnsupported = (commandId: string | undefined, argv: string[]): boolean => {
  const id = commandId?.toLowerCase();
  if (!id || ALLOWED_COMMANDS.has(id) || id.startsWith('autocomplete')) return true;
  return id === 'webdav' && argv.some((arg) => ALLOWED_WEBDAV_ACTIONS.has(arg.toLowerCase()));
};

const hook: Hook<'prerun'> = async function ({ Command, argv }) {
  if (isAllowedWhenUnsupported(Command.id, argv)) return;

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
