import { beforeEach, describe, expect, test, vi } from 'vitest';
import { ux } from '@oclif/core';
import hook, { isAllowedWhenUnsupported } from '../../src/hooks/prerun/version_check';
import { ClientCompatibilityService, CompatibilityVerdict } from '../../src/services/client-compatibility.service';
import { CLIENT_VERSION_UNSUPPORTED, ClientVersionUnsupportedError } from '../../src/utils/errors.utils';

const runHook = async (id: string, argv: string[] = []) => {
  const context = { log: vi.fn(), exit: vi.fn() };
  // @ts-expect-error partial hook context and options, only the fields the hook reads are needed
  await hook.call(context, { Command: { id }, argv });
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
    const { exit } = await runHook('logout');

    expect(exit).not.toHaveBeenCalled();
    expect(evaluate).not.toHaveBeenCalled();
  });

  describe('isAllowedWhenUnsupported', () => {
    test.each([
      ['logout', []],
      ['logs', []],
      ['webdav-config', ['--port', '3005']],
      ['help', ['list']],
      ['autocomplete', ['zsh']],
      ['autocomplete:script', ['zsh']],
      ['webdav', ['disable']],
      ['webdav', ['stop']],
      ['webdav', ['--json', 'status']],
    ])('%s %j is allowed', (id, argv) => {
      expect(isAllowedWhenUnsupported(id, argv)).toBe(true);
    });

    test.each([
      ['list', []],
      ['login', []],
      ['whoami', []],
      ['webdav', ['enable']],
      ['webdav', ['start']],
      ['webdav', ['restart', '--json']],
    ])('%s %j is blocked', (id, argv) => {
      expect(isAllowedWhenUnsupported(id, argv)).toBe(false);
    });
  });
});
