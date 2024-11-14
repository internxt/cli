import { ux, Flags } from '@oclif/core';

export class CLIUtils {
  static readonly clearPreviousLine = () => {
    process.stdout.write('\x1b[1A');
    process.stdout.clearLine(0);
  };

  static readonly warning = (reporter: (message: string) => void, message: string) => {
    reporter(ux.colorize('#a67805', `⚠ Warning: ${message}`));
  };

  static readonly error = (reporter: (message: string) => void, message: string) => {
    reporter(ux.colorize('red', `⚠ Error: ${message}`));
  };

  static readonly doing = (message: string) => {
    ux.action.start(message, undefined, {});
  };

  static readonly success = (reporter: (message: string) => void, message: string) => {
    reporter(ux.colorize('green', `✓ ${message}`));
  };

  static readonly log = (reporter: (message: string) => void, message: string) => {
    reporter(`${message}`);
  };

  static readonly done = () => {
    ux.action.stop(ux.colorize('green', 'done ✓'));
  };

  static readonly CommonFlags = {
    'non-interactive': Flags.boolean({
      char: 'n',
      env: 'INXT_NONINTERACTIVE',
      helpGroup: 'helper',
      description:
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
      prompt: { message: string; options?: ux.IPromptOptions };
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
      } else {
        if (command.nonInteractive) {
          throw validation.error;
        } else {
          CLIUtils.error(reporter, validation.error.message);
        }
      }
    }
    if (command.nonInteractive) {
      throw new NoFlagProvidedError(flag.name);
    } else {
      return await CLIUtils.promptWithAttempts(command.prompt, command.maxAttempts, validation, reporter);
    }
  };

  private static readonly promptWithAttempts = async (
    prompt: { message: string; options?: ux.IPromptOptions },
    maxAttempts = 3,
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
      promptValue = await ux.prompt(prompt.message, prompt.options);
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

  static readonly prompt = async (
    prompt: { message: string; options?: ux.IPromptOptions; error?: Error },
    validate?: (value: string) => boolean,
  ): Promise<string> => {
    const promptValue = await ux.prompt(prompt.message, prompt.options);
    if (validate) {
      const isValid = validate(promptValue);
      if (!isValid) {
        throw prompt.error;
      }
    }
    return promptValue;
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

  static readonly parseEmpty = async (input: string) => (input.trim().length === 0 ? ' ' : input);
}

class NoFlagProvidedError extends Error {
  constructor(flag: string) {
    super(`No ${flag} flag has been provided`);

    Object.setPrototypeOf(this, NoFlagProvidedError.prototype);
  }
}
