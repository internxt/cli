import { describe, test, expect, vi, beforeEach, MockInstance } from 'vitest';
import { ux } from '@oclif/core';
import { CLIUtils, LogReporter } from '../../src/utils/cli.utils';
import { Direction } from 'node:readline';
import { Options } from '@oclif/core/lib/ux/action/types';
import { LoginUserDetails } from '../../src/types/command.types';
import { SdkManager } from '../../src/services/sdk-manager.service';
import { ConfigService } from '../../src/services/config.service';
import { NetworkFacade } from '../../src/services/network/network-facade.service';
import { Environment } from '@internxt/inxt-js';
import { UserFixture } from '../fixtures/auth.fixture';
import { getNetworkOptionsMock } from '../fixtures/webdav.fixture';
import { NetworkOptions } from '../../src/types/network.types';

vi.mock('ux', () => {
  return {
    action: {
      start: vi.fn(),
      stop: vi.fn(),
      running: false,
    },
    colorize: vi.fn((color: string, text: string) => text),
  };
});

vi.mock('@internxt/inxt-js', () => ({
  Environment: vi.fn(),
}));

vi.mock('../../src/services/network/network-facade.service', () => ({
  NetworkFacade: vi.fn(),
}));

describe('CliUtils', () => {
  let stdoutWrite: MockInstance<{
    (buffer: Uint8Array | string, cb?: (err?: Error) => void): boolean;
    (str: Uint8Array | string, encoding?: BufferEncoding, cb?: (err?: Error) => void): boolean;
  }>;
  let stdoutClear: MockInstance<(dir: Direction, callback?: () => void) => boolean>;
  const reporter: LogReporter = vi.fn();

  const BRIDGE_URL = 'https://test.com';
  const mockNetworkFacade: NetworkFacade = {} as NetworkFacade;
  const mockNetworkOptions: NetworkOptions = getNetworkOptionsMock();
  const mockLoginUserDetails: LoginUserDetails = UserFixture;

  const mockNetworkModule = {} as ReturnType<typeof SdkManager.instance.getNetwork>;
  const mockAppDetails = {} as ReturnType<typeof SdkManager.getAppDetails>;

  beforeEach(() => {
    process.stdout.write = vi.fn();
    process.stdout.clearLine = vi.fn();
    stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stdoutClear = vi.spyOn(process.stdout, 'clearLine').mockImplementation(() => true);

    vi.mocked(NetworkFacade).mockImplementation(function (this: NetworkFacade) {
      return mockNetworkFacade;
    });
    vi.mocked(Environment).mockImplementation(function (this: Environment) {
      return {} as Environment;
    });
    vi.spyOn(SdkManager.instance, 'getNetwork').mockReturnValue(mockNetworkModule);
    vi.spyOn(SdkManager, 'getAppDetails').mockReturnValue(mockAppDetails);
    vi.spyOn(ConfigService.instance, 'get').mockReturnValue(BRIDGE_URL);
  });

  describe('clearPreviousLine', () => {
    test('when json output is disabled, then the previous line is cleared', () => {
      CLIUtils.clearPreviousLine(false);
      expect(stdoutWrite).toHaveBeenCalledWith('\x1b[1A');
      expect(stdoutClear).toHaveBeenCalledWith(0);
    });

    test('when json output is enabled, then the previous line is not cleared', () => {
      CLIUtils.clearPreviousLine(true);
      expect(stdoutWrite).not.toHaveBeenCalled();
      expect(stdoutClear).not.toHaveBeenCalled();
    });

    test('when no flags are provided, then no error is thrown', () => {
      expect(() => CLIUtils.clearPreviousLine()).not.toThrow();
      expect(stdoutWrite).toHaveBeenCalled();
    });
  });

  describe('warning, error, success, log', () => {
    test('when a warning is reported, then the message is formatted and passed to the reporter', () => {
      vi.spyOn(ux, 'colorize').mockImplementation(vi.fn((color: string | undefined, text: string) => text));
      CLIUtils.warning(reporter, 'Test');
      expect(ux.colorize).toHaveBeenCalledWith('#a67805', '⚠ Warning: Test');
      expect(reporter).toHaveBeenCalledWith('⚠ Warning: Test');
    });

    test('when an error is reported, then the message is formatted and passed to the reporter', () => {
      vi.spyOn(ux, 'colorize').mockImplementation(vi.fn((color: string | undefined, text: string) => text));
      CLIUtils.error(reporter, 'Test');
      expect(ux.colorize).toHaveBeenCalledWith('red', '⚠ Error: Test');
      expect(reporter).toHaveBeenCalledWith('⚠ Error: Test');
    });

    test('when a success is reported, then the message is formatted and passed to the reporter', () => {
      vi.spyOn(ux, 'colorize').mockImplementation(vi.fn((color: string | undefined, text: string) => text));
      CLIUtils.success(reporter, 'Test');
      expect(ux.colorize).toHaveBeenCalledWith('green', '✓ Test');
      expect(reporter).toHaveBeenCalledWith('✓ Test');
    });

    test('when a log message is reported, then it is passed to the reporter', () => {
      vi.spyOn(ux, 'colorize').mockImplementation(vi.fn((color: string | undefined, text: string) => text));
      CLIUtils.log(reporter, 'Hello');
      expect(reporter).toHaveBeenCalledWith('Hello');
    });
  });

  describe('consoleLog', () => {
    test('when logging to console, then the message is printed', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      CLIUtils.consoleLog('Hi');
      expect(consoleSpy).toHaveBeenCalledWith('Hi');
      consoleSpy.mockRestore();
    });
  });

  describe('doing, done, failed', () => {
    test('when json output is disabled, then a spinner action is started', () => {
      vi.spyOn(ux.action, 'start').mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        vi.fn((action: string, status?: string, opts?: Options) => {}),
      );
      CLIUtils.doing('Working', false);
      expect(ux.action.start).toHaveBeenCalledWith('Working', undefined, {});
    });

    test('when json output is enabled, then no spinner action is started', () => {
      vi.spyOn(ux.action, 'start').mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        vi.fn((action: string, status?: string, opts?: Options) => {}),
      );
      CLIUtils.doing('Anything', true);
      expect(ux.action.start).not.toHaveBeenCalled();
    });

    test('when an action is running, then it is marked as done', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      vi.spyOn(ux.action, 'stop').mockImplementation(vi.fn((msg?: string) => {}));
      vi.spyOn(ux.action, 'running', 'get').mockReturnValue(true);
      CLIUtils.done(false);
      expect(ux.action.stop).toHaveBeenCalledWith('done ✓');
    });

    test('when json output is enabled, then the action is not stopped', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      vi.spyOn(ux.action, 'stop').mockImplementation(vi.fn((msg?: string) => {}));
      vi.spyOn(ux.action, 'running', 'get').mockReturnValue(true);
      CLIUtils.done(true);
      expect(ux.action.stop).not.toHaveBeenCalled();
    });

    test('when an action is running, then it is marked as failed', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      vi.spyOn(ux.action, 'stop').mockImplementation(vi.fn((msg?: string) => {}));
      vi.spyOn(ux.action, 'running', 'get').mockReturnValue(true);
      CLIUtils.failed(false);
      expect(ux.action.stop).toHaveBeenCalledWith('failed ✕');
    });

    test('when json output is enabled, then the action is not marked as failed', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      vi.spyOn(ux.action, 'stop').mockImplementation(vi.fn((msg?: string) => {}));
      vi.spyOn(ux.action, 'running', 'get').mockReturnValue(true);
      CLIUtils.failed(true);
      expect(ux.action.stop).not.toHaveBeenCalled();
    });
  });

  describe('prepareNetwork', () => {
    test('when preparing the network, then a configured network instance is returned', async () => {
      vi.spyOn(CLIUtils, 'getNetworkCreds').mockResolvedValue({
        bucket: mockLoginUserDetails.bucket,
        credentials: {
          user: mockLoginUserDetails.bridgeUser,
          pass: mockLoginUserDetails.userId,
        },
        mnemonic: mockLoginUserDetails.mnemonic,
      });
      const result = await CLIUtils.prepareNetwork(mockLoginUserDetails);

      expect(result).toEqual(mockNetworkOptions);
      expect(SdkManager.instance.getNetwork).toHaveBeenCalledWith({
        user: mockLoginUserDetails.bridgeUser,
        pass: mockLoginUserDetails.userId,
      });
      expect(Environment).toHaveBeenCalledWith({
        bridgeUser: mockLoginUserDetails.bridgeUser,
        bridgePass: mockLoginUserDetails.userId,
        bridgeUrl: BRIDGE_URL,
        encryptionKey: mockLoginUserDetails.mnemonic,
        appDetails: mockAppDetails,
      });
      expect(NetworkFacade).toHaveBeenCalledTimes(1);
    });
  });

  describe('timer', () => {
    test('when time passes, then the elapsed time is measured correctly', () => {
      vi.useFakeTimers();
      const timer = CLIUtils.timer();
      vi.advanceTimersByTime(1500);
      const elapsed = timer.stop();
      expect(elapsed).toBe(1500);
      vi.useRealTimers();
    });

    test('when stopped immediately, then the elapsed time is zero', () => {
      vi.useFakeTimers();
      const timer = CLIUtils.timer();
      const elapsed = timer.stop();
      expect(elapsed).toBe(0);
      vi.useRealTimers();
    });

    test('when multiple timers are running, then they each measure independently', () => {
      vi.useFakeTimers();
      const timer1 = CLIUtils.timer();
      vi.advanceTimersByTime(500);
      const timer2 = CLIUtils.timer();
      vi.advanceTimersByTime(500);
      const elapsed1 = timer1.stop();
      const elapsed2 = timer2.stop();
      expect(elapsed1).toBe(1000);
      expect(elapsed2).toBe(500);
      vi.useRealTimers();
    });
  });

  describe('formatDuration', () => {
    test('when formatting seconds, then the duration is displayed correctly', () => {
      expect(CLIUtils.formatDuration(5000)).toBe('00:00:05.000');
    });

    test('when formatting minutes and seconds, then the duration is displayed correctly', () => {
      expect(CLIUtils.formatDuration(125000)).toBe('00:02:05.000');
    });

    test('when formatting hours, minutes, and seconds, then the duration is displayed correctly', () => {
      expect(CLIUtils.formatDuration(3665000)).toBe('01:01:05.000');
    });

    test('when formatting zero milliseconds, then the duration is zero', () => {
      expect(CLIUtils.formatDuration(0)).toBe('00:00:00.000');
    });

    test('when formatting less than a second, then the duration is displayed correctly', () => {
      expect(CLIUtils.formatDuration(999)).toBe('00:00:00.999');
    });

    test('when formatting large durations, then the duration is displayed correctly', () => {
      expect(CLIUtils.formatDuration(86400000)).toBe('24:00:00.000');
    });

    test('when formatting durations, then single digits are padded with zeros', () => {
      expect(CLIUtils.formatDuration(3661000)).toBe('01:01:01.000');
    });

    test('when a negative value is given, then zero is returned', () => {
      expect(CLIUtils.formatDuration(-5000)).toBe('00:00:00.000');
    });

    test('when formatting milliseconds, then the duration is displayed correctly', () => {
      expect(CLIUtils.formatDuration(1234)).toBe('00:00:01.234');
    });

    test('when formatting milliseconds, then they are padded with zeros', () => {
      expect(CLIUtils.formatDuration(5001)).toBe('00:00:05.001');
    });
  });

  describe('calculateThroughputMBps', () => {
    test('when calculating throughput, then the value in MB/s is correct', () => {
      const throughput = CLIUtils.calculateThroughputMBps(10485760, 1000);
      expect(throughput).toBe(10);
    });

    test('when zero bytes are transferred, then the throughput is zero', () => {
      const throughput = CLIUtils.calculateThroughputMBps(0, 1000);
      expect(throughput).toBe(0);
    });

    test('when calculating throughput, then fractional values are handled', () => {
      const throughput = CLIUtils.calculateThroughputMBps(5242880, 2000);
      expect(throughput).toBe(2.5);
    });

    test('when the time is very small, then the throughput is calculated correctly', () => {
      const throughput = CLIUtils.calculateThroughputMBps(1048576, 100);
      expect(throughput).toBe(10);
    });

    test('when large amounts of data are transferred, then the throughput is calculated correctly', () => {
      const throughput = CLIUtils.calculateThroughputMBps(104857600, 10000);
      expect(throughput).toBe(10);
    });

    test('when negative bytes are given, then the throughput is zero', () => {
      const throughput = CLIUtils.calculateThroughputMBps(-1048576, 1000);
      expect(throughput).toBe(0);
    });

    test('when negative time is given, then the throughput is zero', () => {
      const throughput = CLIUtils.calculateThroughputMBps(1048576, -1000);
      expect(throughput).toBe(0);
    });
  });
});
