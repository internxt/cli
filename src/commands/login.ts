import { Command, Flags } from '@oclif/core';
import { EmptyPasswordError, NotValidEmailError, NotValidTwoFactorCodeError } from '../types/command.types';
import { AuthService } from '../services/auth.service';
import { ConfigService } from '../services/config.service';
import { ValidationService } from '../services/validation.service';
import { CLIUtils } from '../utils/cli.utils';
import { SdkManager } from '../services/sdk-manager.service';

export default class Login extends Command {
  static readonly args = {};
  static readonly description =
    'Logs into an Internxt account. If the account is two-factor protected, then an extra code will be required.';
  static readonly aliases = [];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {
    ...CLIUtils.CommonFlags,
    email: Flags.string({
      char: 'e',
      aliases: ['mail'],
      env: 'INXT_EMAIL',
      description: 'The email to log in',
      required: false,
    }),
    password: Flags.string({
      char: 'p',
      aliases: ['pass'],
      env: 'INXT_PASSWORD',
      description: 'The plain password to log in',
      required: false,
    }),
    twofactor: Flags.string({
      char: 'w',
      aliases: ['two', 'two-factor'],
      env: 'INXT_TWOFACTORCODE',
      description: 'The two factor auth code (only needed if the account is two-factor protected)',
      required: false,
      helpValue: '123456',
    }),
  };
  static readonly enableJsonFlag = true;

  public run = async () => {
    const { flags } = await this.parse(Login);

    const nonInteractive = flags['non-interactive'];
    const email = await this.getEmail(flags['email'], nonInteractive);
    const password = await this.getPassword(flags['password'], nonInteractive);

    const is2FANeeded = await AuthService.instance.is2FANeeded(email);
    let twoFactorCode: string | undefined;
    if (is2FANeeded) {
      twoFactorCode = await this.getTwoFactorCode(flags['twofactor'], nonInteractive);
    }

    const loginCredentials = await AuthService.instance.doLogin(email, password, twoFactorCode);

    SdkManager.init({
      token: loginCredentials.token,
      newToken: loginCredentials.newToken,
    });

    await ConfigService.instance.saveUser(loginCredentials);
    const message = `Succesfully logged in to: ${loginCredentials.user.email}`;
    CLIUtils.success(this.log.bind(this), message);
    return {
      success: true,
      message,
      login: loginCredentials,
    };
  };

  public catch = async (error: Error) => {
    const { flags } = await this.parse(Login);
    CLIUtils.catchError({
      error,
      command: this.id,
      logReporter: this.log.bind(this),
      errorReporter: this.error.bind(this),
      jsonFlag: flags['json'],
    });
    this.exit(1);
  };

  private getEmail = async (emailFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    const email = await CLIUtils.getValueFromFlag(
      {
        value: emailFlag,
        name: Login.flags['email'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is your email?',
          options: { type: 'input' },
        },
      },
      {
        validate: ValidationService.instance.validateEmail,
        error: new NotValidEmailError(),
      },
      this.log.bind(this),
    );
    return email;
  };

  private getPassword = async (passwordFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    const password = await CLIUtils.getValueFromFlag(
      {
        value: passwordFlag,
        name: Login.flags['password'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is your password?',
          options: { type: 'password' },
        },
      },
      {
        validate: ValidationService.instance.validateStringIsNotEmpty,
        error: new EmptyPasswordError(),
      },
      this.log.bind(this),
    );
    return password;
  };

  private getTwoFactorCode = async (twoFactorFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    const twoFactor = await CLIUtils.getValueFromFlag(
      {
        value: twoFactorFlag,
        name: Login.flags['twofactor'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is your two-factor token?',
          options: { type: 'mask' },
        },
      },
      {
        validate: ValidationService.instance.validate2FA,
        error: new NotValidTwoFactorCodeError(),
      },
      this.log.bind(this),
    );
    return twoFactor;
  };
}
