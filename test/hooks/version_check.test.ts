import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ux } from '@oclif/core';
import hook, { isAllowedWhenUnsupported } from '../../src/hooks/prerun/version_check';
import { ClientCompatibilityService, CompatibilityVerdict } from '../../src/services/client-compatibility.service';
import { CLIENT_VERSION_UNSUPPORTED, ClientVersionUnsupportedError } from '../../src/utils/errors.utils';
import Login from '../../src/commands/login';
import Logout from '../../src/commands/logout';
import Logs from '../../src/commands/logs';
import Webdav from '../../src/commands/webdav';
import WebDAVConfig from '../../src/commands/webdav-config';
import Whoami from '../../src/commands/whoami';

const loaded = <T extends object>(command: T, id: string) => Object.assign(command, { id });

const runHook = async (command: string | object, argv: string[] = []) => {
  const context = { log: vi.fn(), exit: vi.fn() };
  const Command = typeof command === 'string' ? { id: command } : command;
  // @ts-expect-error partial hook context and options, only the fields the hook reads are needed
  await hook.call(context, { Command, argv });
  return context;
};

describe('Version check prerun hook', () => {
  let evaluate: ReturnType<typeof vi.spyOn>;
  let stderr: ReturnType<typeof vi.spyOn>;

  const mockVerdict = (verdict: CompatibilityVerdict) => evaluate.mockResolvedValue(verdict);

  beforeEach(() => {
    evaluate = vi.spyOn(ClientCompatibilityService.instance, 'evaluate');
    stderr = vi.spyOn(ux, 'stderr').mockImplementation(() => {});
  });

  test('when the version is unsupported, then the command is blocked with the update command', async () => {
    mockVerdict({ blockError: new ClientVersionUnsupportedError('No longer supported.') });

    const { log, exit } = await runHook('list');

    expect(exit).toHaveBeenCalledWith(1);
    expect(log).toHaveBeenCalledWith(expect.stringContaining('No longer supported.'));
    expect(log).toHaveBeenCalledWith(expect.stringContaining('npm install -g @internxt/cli@latest'));
  });

  test('when the version is unsupported and --json is set, then the JSON output has the block code', async () => {
    mockVerdict({ blockError: new ClientVersionUnsupportedError() });
    const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => {});

    const { exit } = await runHook('list', ['--json']);

    expect(exit).toHaveBeenCalledWith(1);
    const output = JSON.parse(consoleLog.mock.calls[0][0] as string);
    expect(output).toMatchObject({ success: false, code: CLIENT_VERSION_UNSUPPORTED, command: 'list' });
  });

  test('when there is a warning, then it goes to stderr and the command runs', async () => {
    mockVerdict({ warning: 'Deprecated.' });

    const { log, exit } = await runHook('list', ['--json']);

    expect(exit).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining('Deprecated.'));
  });

  test('when there is nothing to report, then nothing is printed', async () => {
    mockVerdict({});

    const { log, exit } = await runHook('list');

    expect(exit).not.toHaveBeenCalled();
    expect(log).not.toHaveBeenCalled();
    expect(stderr).not.toHaveBeenCalled();
  });

  test('when the command is allowed while unsupported, then the check is not done', async () => {
    const { exit } = await runHook(loaded(Logout, 'logout'));

    expect(exit).not.toHaveBeenCalled();
    expect(evaluate).not.toHaveBeenCalled();
  });

  describe('isAllowedWhenUnsupported', () => {
    test.each([
      ['logout', loaded(Logout, 'logout'), []],
      ['logs', loaded(Logs, 'logs'), []],
      ['webdav-config', loaded(WebDAVConfig, 'webdav-config'), ['--port', '3005']],
      ['help', { id: 'help' }, ['list']],
      ['autocomplete', { id: 'autocomplete' }, ['zsh']],
      ['autocomplete:script', { id: 'autocomplete:script' }, ['zsh']],
      ['webdav disable', loaded(Webdav, 'webdav'), ['disable']],
      ['webdav stop', loaded(Webdav, 'webdav'), ['stop']],
      ['webdav status', loaded(Webdav, 'webdav'), ['--json', 'status']],
    ])('%s is allowed', (_, command, argv) => {
      expect(isAllowedWhenUnsupported(command, argv)).toBe(true);
    });

    test.each([
      ['list', { id: 'list' }, []],
      ['login', loaded(Login, 'login'), []],
      ['whoami', loaded(Whoami, 'whoami'), []],
      ['a plugin-like prefix', { id: 'helpers' }, []],
      ['another command with an allowed id', { id: 'logout' }, []],
      ['webdav enable', loaded(Webdav, 'webdav'), ['enable']],
      ['webdav start', loaded(Webdav, 'webdav'), ['start']],
      ['webdav restart', loaded(Webdav, 'webdav'), ['restart', '--json']],
    ])('%s is blocked', (_, command, argv) => {
      expect(isAllowedWhenUnsupported(command, argv)).toBe(false);
    });
  });
});
