import { describe, it, expect, vi, beforeEach, afterEach, MockInstance } from 'vitest';
import { ux } from '@oclif/core';
import { CLIUtils } from '../../src/utils/cli.utils';
import { Direction } from 'node:readline';
import { Options } from '@oclif/core/lib/ux/action/types';
import { LoginUserDetails } from '../../src/types/command.types';
import { SdkManager } from '../../src/services/sdk-manager.service';
import { ConfigService } from '../../src/services/config.service';
import { NetworkFacade } from '../../src/services/network/network-facade.service';
import { Environment } from '@internxt/inxt-js';
import { UserFixture } from '../fixtures/auth.fixture';

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
  const reporter: (message: string) => void = vi.fn();

  const BRIDGE_URL = 'https://test.com';
  const mockNetworkFacade: NetworkFacade = {} as NetworkFacade;
  const mockLoginUserDetails: LoginUserDetails = UserFixture;

  const mockNetworkModule = {} as ReturnType<typeof SdkManager.instance.getNetwork>;
  const mockAppDetails = {} as ReturnType<typeof SdkManager.getAppDetails>;

  beforeEach(() => {
    vi.clearAllMocks();
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('clearPreviousLine', () => {
    it('should move cursor up and clear line when jsonFlag is false', () => {
      CLIUtils.clearPreviousLine(false);
      expect(stdoutWrite).toHaveBeenCalledWith('\x1b[1A');
      expect(stdoutClear).toHaveBeenCalledWith(0);
    });

    it('should not call stdout methods when jsonFlag is true', () => {
      CLIUtils.clearPreviousLine(true);
      expect(stdoutWrite).not.toHaveBeenCalled();
      expect(stdoutClear).not.toHaveBeenCalled();
    });

    it('should not throw when no flags provided', () => {
      expect(() => CLIUtils.clearPreviousLine()).not.toThrow();
      expect(stdoutWrite).toHaveBeenCalled();
    });
  });

  describe('warning, error, success, log', () => {
    it('warning should call reporter with colored warning', () => {
      vi.spyOn(ux, 'colorize').mockImplementation(vi.fn((color: string | undefined, text: string) => text));
      CLIUtils.warning(reporter, 'Test');
      expect(ux.colorize).toHaveBeenCalledWith('#a67805', '⚠ Warning: Test');
      expect(reporter).toHaveBeenCalledWith('⚠ Warning: Test');
    });

    it('error should call reporter with colored error', () => {
      vi.spyOn(ux, 'colorize').mockImplementation(vi.fn((color: string | undefined, text: string) => text));
      CLIUtils.error(reporter, 'Test');
      expect(ux.colorize).toHaveBeenCalledWith('red', '⚠ Error: Test');
      expect(reporter).toHaveBeenCalledWith('⚠ Error: Test');
    });

    it('success should call reporter with colored success', () => {
      vi.spyOn(ux, 'colorize').mockImplementation(vi.fn((color: string | undefined, text: string) => text));
      CLIUtils.success(reporter, 'Test');
      expect(ux.colorize).toHaveBeenCalledWith('green', '✓ Test');
      expect(reporter).toHaveBeenCalledWith('✓ Test');
    });

    it('log should call reporter with message', () => {
      vi.spyOn(ux, 'colorize').mockImplementation(vi.fn((color: string | undefined, text: string) => text));
      CLIUtils.log(reporter, 'Hello');
      expect(reporter).toHaveBeenCalledWith('Hello');
    });
  });

  describe('consoleLog', () => {
    it('consoleLog should print to console', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      CLIUtils.consoleLog('Hi');
      expect(consoleSpy).toHaveBeenCalledWith('Hi');
      consoleSpy.mockRestore();
    });
  });

  describe('doing, done, failed', () => {
    it('doing should start ux action when jsonFlag is false', () => {
      vi.spyOn(ux.action, 'start').mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        vi.fn((action: string, status?: string, opts?: Options) => {}),
      );
      CLIUtils.doing('Working', false);
      expect(ux.action.start).toHaveBeenCalledWith('Working', undefined, {});
    });

    it('doing should not call when jsonFlag is true', () => {
      vi.spyOn(ux.action, 'start').mockImplementation(
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        vi.fn((action: string, status?: string, opts?: Options) => {}),
      );
      CLIUtils.doing('Anything', true);
      expect(ux.action.start).not.toHaveBeenCalled();
    });

    it('done should stop ux action with colored done when running', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      vi.spyOn(ux.action, 'stop').mockImplementation(vi.fn((msg?: string) => {}));
      vi.spyOn(ux.action, 'running', 'get').mockReturnValue(true);
      CLIUtils.done(false);
      expect(ux.action.stop).toHaveBeenCalledWith('done ✓');
    });

    it('done should not stop action when jsonFlag is true', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      vi.spyOn(ux.action, 'stop').mockImplementation(vi.fn((msg?: string) => {}));
      vi.spyOn(ux.action, 'running', 'get').mockReturnValue(true);
      CLIUtils.done(true);
      expect(ux.action.stop).not.toHaveBeenCalled();
    });

    it('failed should stop ux action with colored failed when running', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      vi.spyOn(ux.action, 'stop').mockImplementation(vi.fn((msg?: string) => {}));
      vi.spyOn(ux.action, 'running', 'get').mockReturnValue(true);
      CLIUtils.failed(false);
      expect(ux.action.stop).toHaveBeenCalledWith('failed ✕');
    });

    it('failed should not stop when jsonFlag is true', () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      vi.spyOn(ux.action, 'stop').mockImplementation(vi.fn((msg?: string) => {}));
      vi.spyOn(ux.action, 'running', 'get').mockReturnValue(true);
      CLIUtils.failed(true);
      expect(ux.action.stop).not.toHaveBeenCalled();
    });
  });

  describe('prepareNetwork', () => {
    it('should properly create a networkFacade instance and return it', async () => {
      vi.spyOn(CLIUtils, 'getNetworkCreds').mockResolvedValue({
        bucket: mockLoginUserDetails.bucket,
        credentials: {
          user: mockLoginUserDetails.bridgeUser,
          pass: mockLoginUserDetails.userId,
        },
        mnemonic: mockLoginUserDetails.mnemonic,
      });
      const result = await CLIUtils.prepareNetwork(mockLoginUserDetails);

      expect(result).toBe(mockNetworkFacade);
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
    it('should measure elapsed time correctly', () => {
      vi.useFakeTimers();
      const timer = CLIUtils.timer();
      vi.advanceTimersByTime(1500);
      const elapsed = timer.stop();
      expect(elapsed).toBe(1500);
      vi.useRealTimers();
    });

    it('should measure zero time when stopped immediately', () => {
      vi.useFakeTimers();
      const timer = CLIUtils.timer();
      const elapsed = timer.stop();
      expect(elapsed).toBe(0);
      vi.useRealTimers();
    });

    it('should handle multiple timers independently', () => {
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
    it('should format seconds correctly', () => {
      expect(CLIUtils.formatDuration(5000)).toBe('00:00:05.000');
    });

    it('should format minutes and seconds correctly', () => {
      expect(CLIUtils.formatDuration(125000)).toBe('00:02:05.000');
    });

    it('should format hours, minutes, and seconds correctly', () => {
      expect(CLIUtils.formatDuration(3665000)).toBe('01:01:05.000');
    });

    it('should format zero milliseconds', () => {
      expect(CLIUtils.formatDuration(0)).toBe('00:00:00.000');
    });

    it('should handle milliseconds less than a second', () => {
      expect(CLIUtils.formatDuration(999)).toBe('00:00:00.999');
    });

    it('should handle large durations', () => {
      expect(CLIUtils.formatDuration(86400000)).toBe('24:00:00.000');
    });

    it('should pad single digits with zeros', () => {
      expect(CLIUtils.formatDuration(3661000)).toBe('01:01:01.000');
    });

    it('should handle negative values gracefully', () => {
      expect(CLIUtils.formatDuration(-5000)).toBe('00:00:00.000');
    });

    it('should format milliseconds correctly', () => {
      expect(CLIUtils.formatDuration(1234)).toBe('00:00:01.234');
    });

    it('should pad milliseconds with zeros', () => {
      expect(CLIUtils.formatDuration(5001)).toBe('00:00:05.001');
    });
  });

  describe('formatBytesToString', () => {
    it('should format bytes to MB correctly', () => {
      expect(CLIUtils.formatBytesToString(1048576)).toBe('1.00 MB');
    });

    it('should handle zero bytes', () => {
      expect(CLIUtils.formatBytesToString(0)).toBe('0.00 KB');
    });

    it('should format small byte values in KB', () => {
      expect(CLIUtils.formatBytesToString(1024)).toBe('1.00 KB');
    });

    it('should format large byte values in MB', () => {
      expect(CLIUtils.formatBytesToString(10485760)).toBe('10.00 MB');
    });

    it('should round to two decimal places for MB', () => {
      expect(CLIUtils.formatBytesToString(1572864)).toBe('1.50 MB');
    });

    it('should handle fractional MB values', () => {
      expect(CLIUtils.formatBytesToString(2621440)).toBe('2.50 MB');
    });

    it('should handle negative values gracefully', () => {
      expect(CLIUtils.formatBytesToString(-1048576)).toBe('0.00 KB');
    });

    it('should format bytes less than 1 KB', () => {
      expect(CLIUtils.formatBytesToString(512)).toBe('0.50 KB');
    });

    it('should switch from KB to MB at 1024 KB', () => {
      expect(CLIUtils.formatBytesToString(1048575)).toBe('1024.00 KB');
      expect(CLIUtils.formatBytesToString(1048576)).toBe('1.00 MB');
    });
  });

  describe('calculateThroughputMBps', () => {
    it('should calculate throughput in MB/s correctly', () => {
      const throughput = CLIUtils.calculateThroughputMBps(10485760, 1000);
      expect(throughput).toBe(10);
    });

    it('should handle zero bytes', () => {
      const throughput = CLIUtils.calculateThroughputMBps(0, 1000);
      expect(throughput).toBe(0);
    });

    it('should handle fractional throughput', () => {
      const throughput = CLIUtils.calculateThroughputMBps(5242880, 2000);
      expect(throughput).toBe(2.5);
    });

    it('should handle very small time values', () => {
      const throughput = CLIUtils.calculateThroughputMBps(1048576, 100);
      expect(throughput).toBe(10);
    });

    it('should handle large byte values', () => {
      const throughput = CLIUtils.calculateThroughputMBps(104857600, 10000);
      expect(throughput).toBe(10);
    });

    it('should handle negative bytes gracefully', () => {
      const throughput = CLIUtils.calculateThroughputMBps(-1048576, 1000);
      expect(throughput).toBe(0);
    });

    it('should handle negative time gracefully', () => {
      const throughput = CLIUtils.calculateThroughputMBps(1048576, -1000);
      expect(throughput).toBe(0);
    });
  });
});
