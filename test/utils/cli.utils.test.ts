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

vi.mock('../../src/services/sdk-manager.service', () => ({
  SdkManager: {
    instance: {
      getNetwork: vi.fn(),
    },
    getAppDetails: vi.fn(),
  },
}));

vi.mock('../../src/services/config.service', () => ({
  ConfigService: {
    instance: {
      get: vi.fn(),
    },
  },
}));

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
  let reporter: (message: string) => void;

  const BRIDGE_URL = 'https://test.com';
  let mockNetworkFacade: NetworkFacade;
  const mockLoginUserDetails = {
    bridgeUser: 'test-bridge-user',
    userId: 'test-user-id',
    mnemonic: 'test-mnemonic',
  } as LoginUserDetails;

  const mockNetworkModule = {} as ReturnType<typeof SdkManager.instance.getNetwork>;
  const mockAppDetails = {} as ReturnType<typeof SdkManager.getAppDetails>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.stdout.write = vi.fn();
    process.stdout.clearLine = vi.fn();
    stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stdoutClear = vi.spyOn(process.stdout, 'clearLine').mockImplementation(() => true);

    reporter = vi.fn();

    mockNetworkFacade = {} as NetworkFacade;
    vi.mocked(NetworkFacade).mockImplementation(function (this: NetworkFacade) {
      return mockNetworkFacade;
    });
    vi.mocked(Environment).mockImplementation(function (this: Environment) {
      return {} as Environment;
    });
    vi.mocked(SdkManager.instance.getNetwork).mockReturnValue(mockNetworkModule);
    vi.mocked(SdkManager.getAppDetails).mockReturnValue(mockAppDetails);
    vi.mocked(ConfigService.instance.get).mockReturnValue(BRIDGE_URL);
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
    it('should properly create a networkFacade instance and return it', () => {
      const result = CLIUtils.prepareNetwork({ loginUserDetails: mockLoginUserDetails });

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

    it('should properly output to the terminal the prepare network step', () => {
      const jsonFlag = true;
      const doingSpy = vi.spyOn(CLIUtils, 'doing');
      const doneSpy = vi.spyOn(CLIUtils, 'done');

      CLIUtils.prepareNetwork({ jsonFlag, loginUserDetails: mockLoginUserDetails });

      expect(doingSpy).toHaveBeenCalledWith('Preparing Network', jsonFlag);
      expect(doneSpy).toHaveBeenCalledWith(jsonFlag);
    });
  });
});
