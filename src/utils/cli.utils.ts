import { ux, Flags } from '@oclif/core';

export class CLIUtils {
  static clearPreviousLine() {
    process.stdout.write('\x1b[1A');
    process.stdout.clearLine(0);
  }

  static warning(message: string) {
    ux.log(ux.colorize('#a67805', `⚠ Warning: ${message}`));
  }

  static error(message: string) {
    ux.log(ux.colorize('red', `⚠ Error: ${message}`));
  }

  static doing(message: string) {
    ux.action.start(message, undefined, {});
  }

  static success(message: string) {
    ux.log(ux.colorize('green', `✓ ${message}`));
  }

  static done() {
    ux.action.stop(ux.colorize('green', 'done ✓'));
  }

  static readonly CommonFlags = {
    'non-interactive': Flags.boolean({
      char: 'n',
      env: 'INXT_NONINTERACTIVE',
      helpGroup: 'helper',
      description:
        'Blocks the cli from being interactive. If passed, the cli will not request data through the console and will throw errors directly',
      required: false,
    }),
  };

  static readonly getValueFromFlag = (
    flag: { value?: string; name: string; error: Error; canBeEmpty?: boolean },
    nonInteractive: boolean,
    validate: (value: string) => boolean,
  ): string | undefined => {
    // It returns the value passed from the flag if it is valid. If it is not valid, it will throw an error when nonInteractive mode is active and a warning otherwise
    // It throws an error if nonInteractive mode is active and no flag value is aquired
    if (flag.canBeEmpty) {
      if (!flag.value || flag.value.trim().length === 0) {
        return '';
      }
    }
    if (flag.value) {
      const isValid = validate(flag.value);
      if (isValid) {
        return flag.value;
      } else if (nonInteractive) {
        throw flag.error;
      } else {
        CLIUtils.error(flag.error.message);
      }
    } else if (nonInteractive) {
      throw new NoFlagProvidedError(flag.name);
    }
  };

  static readonly promptWithAttempts = async (
    prompt: { message: string; options?: ux.IPromptOptions; error: Error },
    maxAttempts: number,
    validate: (value: string) => boolean,
  ): Promise<string> => {
    let isValid = false;
    let currentAttempts = 0;
    let promptValue = '';
    do {
      promptValue = await ux.prompt(prompt.message, prompt.options);
      isValid = validate(promptValue);
      if (!isValid) {
        currentAttempts++;
        if (currentAttempts < maxAttempts) {
          CLIUtils.warning(prompt.error.message + ', please type it again');
        }
      }
    } while (!isValid && currentAttempts < maxAttempts);

    if (!isValid) {
      throw prompt.error;
    } else {
      return promptValue;
    }
  };

  static timer() {
    const start = new Date();
    return {
      stop: () => {
        const end = new Date();
        const time = end.getTime() - start.getTime();
        return time;
      },
    };
  }

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

  static readonly parseEmpty = async (input: string) => (input.trim().length === 0 ? ' ' : input);
}

class NoFlagProvidedError extends Error {
  constructor(flag: string) {
    super(`No ${flag} flag has been provided`);

    Object.setPrototypeOf(this, NoFlagProvidedError.prototype);
  }
}
