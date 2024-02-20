import { Command, Flags, ux } from '@oclif/core';
import { AuthService } from '../services/auth.service';
import { ValidationService } from '../services/validation.service';
import {
  EmptyPasswordError,
  NoFlagProvidedError,
  NotValidEmailError,
  NotValidTwoFactorCodeError,
} from '../types/login.types';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';

export default class Login extends Command {
  static args = {};
  static description =
    'Logs into an Internxt account. If the account is two-factor protected, then an extra code will be required.\n' +
    'Using the password parameter is not recommended as it can lead to security problems (the password is written plainly in the console), ' +
    'it is safer to type your password interactively when the cli asks for it.';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  static flags = {
    email: Flags.string({
      char: 'e',
      env: 'INXT_EMAIL',
      description: 'The email to log in',
      required: false,
    }),
    password: Flags.string({
      char: 'p',
      env: 'INXT_PASSWORD',
      description: '[Insecure] The plain password to log in',
      required: false,
    }),
    'two-factor': Flags.string({
      char: 'w',
      env: 'MY_NAME',
      description: '[If needed] The two factor auth code',
      required: false,
      helpValue: '123456',
    }),
    'non-interactive': Flags.boolean({
      char: 'n',
      env: 'MY_NAME',
      helpGroup: 'helper',
      description:
        'Blocks the cli from being interactive. If passed, the cli will not request data through the console and will throw errors directly',
      required: false,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Login);

    const email = await this.getEmail(flags['email'], flags['non-interactive']);
    const password = await this.getPassword(flags['password'], flags['non-interactive']);

    const is2FANeeded = await AuthService.instance.is2FANeeded(email);
    let twoFactorCode: string | undefined;
    if (is2FANeeded) {
      twoFactorCode = await this.getTwoFactorCode(flags['two-factor'], flags['non-interactive']);
    }

    const loginCredentials = await AuthService.instance.doLogin(email, password, twoFactorCode);
    await ConfigService.instance.saveUser(loginCredentials);
  }

  async catch(error: Error) {
    CLIUtils.error(error.message);
    this.exit(1);
  }

  private static readonly maxAttempts = 3; // max of attempts to let the user rewrite their credentials in case of mistake

  public getEmail = async (emailFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    let isValidEmail = false;

    if (emailFlag) {
      isValidEmail = ValidationService.instance.validateEmail(emailFlag);
      if (nonInteractive) {
        if (isValidEmail) {
          return emailFlag;
        } else {
          throw new NotValidEmailError(emailFlag);
        }
      } else {
        if (isValidEmail) {
          return emailFlag;
        } else {
          CLIUtils.error(`'${emailFlag}' is not a valid email, please type it again`);
        }
      }
    } else {
      if (nonInteractive) throw new NoFlagProvidedError(Login.flags['email'].name);
    }

    // interactive asking
    let currentAttempts = 0;
    let email = '';
    do {
      email = await ux.prompt('What is your email?');
      isValidEmail = ValidationService.instance.validateEmail(email);
      if (!isValidEmail) {
        currentAttempts++;
        const tryAgain = currentAttempts < Login.maxAttempts ? ', please type it again' : '';
        CLIUtils.error(`'${email}' is not a valid email${tryAgain}`);
      }
    } while (!isValidEmail && currentAttempts < Login.maxAttempts);

    if (!isValidEmail) throw new NotValidEmailError(email);
    return email;
  };

  public getPassword = async (passwordFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    let isValidPassword = false;

    if (passwordFlag) {
      isValidPassword = passwordFlag.trim().length > 0;
      if (nonInteractive) {
        if (isValidPassword) {
          return passwordFlag;
        } else {
          throw new EmptyPasswordError();
        }
      } else {
        if (isValidPassword) {
          return passwordFlag;
        } else {
          CLIUtils.error('Password can not be empty, please type it again');
        }
      }
    } else {
      if (nonInteractive) throw new NoFlagProvidedError(Login.flags['password'].name);
    }

    // interactive asking
    let password = '';
    let currentAttempts = 0;
    do {
      password = await ux.prompt('What is your password?', { type: 'hide', required: true });
      isValidPassword = password.trim().length > 0;
      if (!isValidPassword) {
        currentAttempts++;
        const tryAgain = currentAttempts < Login.maxAttempts ? ', please type it again' : '';
        CLIUtils.error(`Password can not be empty, please type it again${tryAgain}`);
      }
    } while (!isValidPassword && currentAttempts < Login.maxAttempts);

    if (!isValidPassword) throw new EmptyPasswordError();
    return password;
  };

  public getTwoFactorCode = async (twoFactorFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    let isValid2FAcode = false;

    if (twoFactorFlag) {
      isValid2FAcode = ValidationService.instance.validate2FA(twoFactorFlag);
      if (nonInteractive) {
        if (isValid2FAcode) {
          return twoFactorFlag;
        } else {
          throw new NotValidTwoFactorCodeError();
        }
      } else {
        if (isValid2FAcode) {
          return twoFactorFlag;
        } else {
          CLIUtils.error('Two factor auth code is not valid, please type it again');
        }
      }
    } else {
      if (nonInteractive) throw new NoFlagProvidedError(Login.flags['two-factor'].name);
    }

    // interactive asking
    let currentAttempts = 0;
    let twoFactorCode = '';
    do {
      twoFactorCode = await ux.prompt('What is your two-factor token?', { type: 'mask' });
      isValid2FAcode = ValidationService.instance.validate2FA(twoFactorCode);
      if (!isValid2FAcode) {
        currentAttempts++;
        const tryAgain = currentAttempts < Login.maxAttempts ? ', please type it again' : '';
        CLIUtils.error(`Two factor auth code is not valid, please type it again${tryAgain}`);
      }
    } while (!isValid2FAcode && currentAttempts < Login.maxAttempts);

    if (!isValid2FAcode) throw new NotValidTwoFactorCodeError();
    return twoFactorCode;
  };
}
