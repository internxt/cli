import { ux } from '@oclif/core';

export class CLIUtils {
  static warning(message: string) {
    ux.log(ux.colorize('#a67805', `⚠ Warning: ${message}`));
  }

  static error(message: string) {
    ux.log(ux.colorize('red', `⚠ Error: ${message}`));
  }

  static doing(message: string) {
    ux.action.start(message);
  }

  static success(message: string) {
    ux.log(ux.colorize('green', `✓ ${message}`));
  }

  static done() {
    ux.action.stop(ux.colorize('green', 'done ✓'));
  }

  static readonly getValueFromFlag = (
    flag: { value?: string; name: string; error: Error },
    nonInteractive: boolean,
    validate: (value: string) => boolean,
  ): string | undefined => {
    // It returns the value passed from the flag if its valid. If its not valid, it will throw an error when nonInteractive mode is active and a warning otherwise
    // It throws an error if its in nonInteractive mode and no flag value is aquired
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
}

class NoFlagProvidedError extends Error {
  constructor(flag: string) {
    super(`No ${flag} flag has been provided`);

    Object.setPrototypeOf(this, NoFlagProvidedError.prototype);
  }
}
