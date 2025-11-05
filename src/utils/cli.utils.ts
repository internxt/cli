import { ux, Flags } from '@oclif/core';
import cliProgress from 'cli-progress';
import Table, { Header } from 'tty-table';
import { PromptOptions } from '../types/command.types';
import { InquirerUtils } from './inquirer.utils';
import { ErrorUtils } from './errors.utils';

export class CLIUtils {
  static readonly clearPreviousLine = (jsonFlag?: boolean) => {
    if (!jsonFlag) {
      process.stdout?.write?.('\x1b[1A');
      process.stdout?.clearLine?.(0);
    }
  };

  static readonly warning = (reporter: (message: string) => void, message: string) => {
    reporter(ux.colorize('#a67805', `⚠ Warning: ${message}`));
  };

  static readonly error = (reporter: (message: string) => void, message: string) => {
    reporter(ux.colorize('red', `⚠ Error: ${message}`));
  };

  static readonly success = (reporter: (message: string) => void, message: string) => {
    reporter(ux.colorize('green', `✓ ${message}`));
  };

  static readonly log = (reporter: (message: string) => void, message: string) => {
    reporter(`${message}`);
  };

  static readonly consoleLog = (message: string) => {
    // eslint-disable-next-line no-console
    console.log(message);
  };

  static readonly doing = (message: string, jsonFlag?: boolean) => {
    if (!jsonFlag) {
      ux.action.start(message, undefined, {});
    }
  };

  static readonly done = (jsonFlag?: boolean) => {
    if (!jsonFlag && ux.action.running) {
      ux.action.stop(ux.colorize('green', 'done ✓'));
    }
  };

  static readonly failed = (jsonFlag?: boolean) => {
    if (!jsonFlag && ux.action.running) {
      ux.action.stop(ux.colorize('red', 'failed ✕'));
    }
  };

  static readonly progress = (opts: cliProgress.Options, jsonFlag?: boolean) => {
    if (!jsonFlag) {
      return new cliProgress.SingleBar(
        { noTTYOutput: Boolean(!process.stdin.isTTY), ...opts },
        cliProgress.Presets.shades_classic,
      );
    }
  };

  static readonly table = (reporter: (message: string) => void, header: Header[], rows: object[]) => {
    const table = Table(header, rows);
    reporter(table.render());
  };

  static readonly generateTableHeaderFromType = <T extends object>(): Header[] => {
    return Object.keys({} as T).map((key) => ({
      value: key,
      alias: key.charAt(0).toUpperCase() + key.slice(1),
    }));
  };

  static readonly CommonFlags = {
    'non-interactive': Flags.boolean({
      char: 'x',
      env: 'INXT_NONINTERACTIVE',
      helpGroup: 'helper',
      description:
        // eslint-disable-next-line max-len
        'Prevents the CLI from being interactive. When enabled, the CLI will not request input through the console and will throw errors directly.',
      required: false,
    }),
  };

  static readonly getValueFromFlag = async (
    flag: {
      value?: string;
      name: string;
    },
    command: {
      nonInteractive: boolean;
      maxAttempts?: number;
      prompt: { message: string; options: PromptOptions };
    },
    validation: {
      validate: (value: string) => Promise<boolean> | boolean;
      error: Error;
      canBeEmpty?: boolean;
    },
    reporter: (message: string) => void,
  ): Promise<string> => {
    // It returns the value passed from the flag if it is valid. If it is not valid, it will throw an error when nonInteractive mode is active and a warning otherwise
    // It throws an error if nonInteractive mode is active and no flag value is aquired
    if (flag.value) {
      if (validation.canBeEmpty && flag.value.trim().length === 0) {
        return '';
      }
      const isValid = await validation.validate(flag.value);
      if (isValid) {
        return flag.value;
      } else if (command.nonInteractive) {
        throw validation.error;
      } else {
        CLIUtils.error(reporter, validation.error.message);
      }
    }
    if (command.nonInteractive) {
      throw new NoFlagProvidedError(flag.name);
    } else {
      const maxAttempts = command.maxAttempts ?? 3;
      return await CLIUtils.promptWithAttempts(command.prompt, maxAttempts, validation, reporter);
    }
  };

  private static readonly promptWithAttempts = async (
    prompt: { message: string; options: PromptOptions },
    maxAttempts: number,
    validation: {
      validate: (value: string) => Promise<boolean> | boolean;
      error: Error;
      canBeEmpty?: boolean;
    },
    reporter: (message: string) => void,
  ): Promise<string> => {
    let isValid = false;
    let currentAttempts = 0;
    let promptValue = '';
    do {
      promptValue = await InquirerUtils.prompt(prompt.message, prompt.options);
      if (validation.canBeEmpty) {
        if (!promptValue || promptValue.trim().length === 0) {
          return '';
        }
      }
      isValid = await validation.validate(promptValue);
      if (!isValid) {
        currentAttempts++;
        if (currentAttempts < maxAttempts) {
          CLIUtils.warning(reporter, validation.error.message + ', please type it again');
        }
      }
    } while (!isValid && currentAttempts < maxAttempts);

    if (!isValid) {
      throw validation.error;
    } else {
      return promptValue;
    }
  };

  static readonly timer = () => {
    const start = new Date();
    return {
      stop: () => {
        const end = new Date();
        const time = end.getTime() - start.getTime();
        return time;
      },
    };
  };

  static readonly catchError = ({
    error,
    logReporter,
    command,
    jsonFlag,
  }: {
    error: Error;
    command?: string;
    logReporter: (message: string) => void;
    jsonFlag?: boolean;
  }) => {
    let message;
    if ('message' in error && error.message.trim().length > 0) {
      message = error.message;
    } else {
      message = JSON.stringify(error);
    }

    CLIUtils.failed(jsonFlag);
    if (jsonFlag) {
      CLIUtils.consoleLog(JSON.stringify({ success: false, message }));
    } else {
      ErrorUtils.report(error, { command });
      CLIUtils.error(logReporter, message);
    }
  };

  static readonly parseEmpty = async (input: string) => (input.trim().length === 0 ? ' ' : input);
}

export class NoFlagProvidedError extends Error {
  constructor(flag: string) {
    super(`No ${flag} flag has been provided`);

    Object.setPrototypeOf(this, NoFlagProvidedError.prototype);
  }
}
