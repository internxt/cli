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
  static readonly args = {};
  static readonly description =
    'Logs into an Internxt account. If the account is two-factor protected, then an extra code will be required.\n' +
    'Using the password parameter is not recommended as it can lead to security problems (the password is written plainly in the console), ' +
    'it is safer to type your password interactively when the cli asks for it.';

  static readonly examples = ['<%= config.bin %> <%= command.id %>'];

  static readonly flags = {
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
      env: 'INXT_TWOFACTORCODE',
      description: '[If needed] The two factor auth code',
      required: false,
      helpValue: '123456',
    }),
    'non-interactive': Flags.boolean({
      char: 'n',
      env: 'INXT_NONINTERACTIVE',
      helpGroup: 'helper',
      description:
        'Blocks the cli from being interactive. If passed, the cli will not request data through the console and will throw errors directly',
      required: false,
    }),
  };

  public async run(): Promise<void> {
    const { flags } = await this.parse(Login);

    const email =
      (await this.getEmailFromFlag(flags['email'], flags['non-interactive'])) ?? (await this.getEmailInteractively());
    const password =
      (await this.getPasswordFromFlag(flags['password'], flags['non-interactive'])) ??
      (await this.getPasswordInteractively());

    const is2FANeeded = await AuthService.instance.is2FANeeded(email);
    let twoFactorCode: string | undefined;
    if (is2FANeeded) {
      twoFactorCode =
        (await this.getTwoFactorCodeFromFlag(flags['two-factor'], flags['non-interactive'])) ??
        (await this.getTwoFactorCodeInteractively());
    }

    const loginCredentials = await AuthService.instance.doLogin(email, password, twoFactorCode);
    await ConfigService.instance.saveUser(loginCredentials);
  }

  async catch(error: Error) {
    CLIUtils.error(error.message);
    this.exit(1);
  }

  private static readonly MAX_ATTEMPTS = 3; // max of attempts to let the user rewrite their credentials in case of mistake

  public getEmailFromFlag = async (
    emailFlag: string | undefined,
    nonInteractive: boolean,
  ): Promise<string | undefined> => {
    if (emailFlag) {
      const isValidEmail = ValidationService.instance.validateEmail(emailFlag);
      if (isValidEmail) {
        return emailFlag;
      } else if (nonInteractive) {
        throw new NotValidEmailError(emailFlag);
      } else {
        CLIUtils.error(new NotValidEmailError(emailFlag).message);
      }
    } else if (nonInteractive) {
      throw new NoFlagProvidedError(Login.flags['email'].name);
    }
  };

  public getEmailInteractively = async (): Promise<string> => {
    let isValidEmail = false;
    let currentAttempts = 0;
    let email = '';
    do {
      email = await ux.prompt('What is your email?');
      isValidEmail = ValidationService.instance.validateEmail(email);
      if (!isValidEmail) {
        currentAttempts++;
        if (currentAttempts < Login.MAX_ATTEMPTS) {
          CLIUtils.warning(`'${email}' is not a valid email, please type it again`);
        }
      }
    } while (!isValidEmail && currentAttempts < Login.MAX_ATTEMPTS);

    if (!isValidEmail) throw new NotValidEmailError(email);
    return email;
  };

  public getPasswordFromFlag = async (
    passwordFlag: string | undefined,
    nonInteractive: boolean,
  ): Promise<string | undefined> => {
    if (passwordFlag) {
      const isValidPassword = passwordFlag.trim().length > 0;
      if (isValidPassword) {
        return passwordFlag;
      } else if (nonInteractive) {
        throw new EmptyPasswordError();
      } else {
        CLIUtils.error(new EmptyPasswordError().message);
      }
    } else if (nonInteractive) {
      throw new NoFlagProvidedError(Login.flags['password'].name);
    }
  };

  public getPasswordInteractively = async (): Promise<string> => {
    let isValidPassword = false;
    let password = '';
    let currentAttempts = 0;
    do {
      password = await ux.prompt('What is your password?', { type: 'hide', required: true });
      isValidPassword = password.trim().length > 0;
      if (!isValidPassword) {
        currentAttempts++;
        if (currentAttempts < Login.MAX_ATTEMPTS) {
          CLIUtils.warning('Password can not be empty, please type it again');
        }
      }
    } while (!isValidPassword && currentAttempts < Login.MAX_ATTEMPTS);

    if (!isValidPassword) throw new EmptyPasswordError();
    return password;
  };

  public getTwoFactorCodeFromFlag = async (
    twoFactorFlag: string | undefined,
    nonInteractive: boolean,
  ): Promise<string | undefined> => {
    if (twoFactorFlag) {
      const isValid2FAcode = ValidationService.instance.validate2FA(twoFactorFlag);
      if (isValid2FAcode) {
        return twoFactorFlag;
      } else if (nonInteractive) {
        throw new NotValidTwoFactorCodeError();
      } else {
        CLIUtils.error(new NotValidTwoFactorCodeError().message);
      }
    } else if (nonInteractive) {
      throw new NoFlagProvidedError(Login.flags['two-factor'].name);
    }
  };

  public getTwoFactorCodeInteractively = async (): Promise<string> => {
    let isValid2FAcode = false;
    let currentAttempts = 0;
    let twoFactorCode = '';
    do {
      twoFactorCode = await ux.prompt('What is your two-factor token?', { type: 'mask' });
      isValid2FAcode = ValidationService.instance.validate2FA(twoFactorCode);
      if (!isValid2FAcode) {
        currentAttempts++;
        if (currentAttempts < Login.MAX_ATTEMPTS) {
          CLIUtils.warning('Two factor auth code is not valid, please type it again');
        }
      }
    } while (!isValid2FAcode && currentAttempts < Login.MAX_ATTEMPTS);

    if (!isValid2FAcode) throw new NotValidTwoFactorCodeError();
    return twoFactorCode;
  };
}
