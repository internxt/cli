import { Command, Flags } from '@oclif/core';
import { EmptyPasswordError, NotValidEmailError, NotValidTwoFactorCodeError } from '../types/command.types';
import { AuthService } from '../services/auth.service';
import { ConfigService } from '../services/config.service';
import { ValidationService } from '../services/validation.service';
import { CLIUtils } from '../utils/cli.utils';
import { ErrorUtils } from '../utils/errors.utils';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { SdkManager } from '../services/sdk-manager.service';
import { DriveDatabaseManager } from '../services/database/drive-database-manager.service';

export default class Login extends Command {
  static readonly args = {};
  static readonly description =
    'Logs into an Internxt account. If the account is two-factor protected, then an extra code will be required.';

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

  public async run(): Promise<void> {
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

    const rootMeta = await DriveFolderService.instance.getFolderMetaById(loginCredentials.user.root_folder_id);

    await ConfigService.instance.saveUser(Object.assign(loginCredentials, { root_folder_uuid: rootMeta.uuid }));

    await DriveDatabaseManager.clean();

    CLIUtils.success(`Succesfully logged in to: ${loginCredentials.user.email} `);
  }

  async catch(error: Error) {
    ErrorUtils.report(error, { command: this.id });
    CLIUtils.error(error.message);
    this.exit(1);
  }

  public getEmail = async (emailFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    let email = CLIUtils.getValueFromFlag(
      {
        value: emailFlag,
        name: Login.flags['email'].name,
        error: new NotValidEmailError(),
      },
      nonInteractive,
      ValidationService.instance.validateEmail,
    );
    if (!email) {
      email = await this.getEmailInteractively();
    }
    return email;
  };

  public getPassword = async (passwordFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    let password = CLIUtils.getValueFromFlag(
      {
        value: passwordFlag,
        name: Login.flags['password'].name,
        error: new EmptyPasswordError(),
      },
      nonInteractive,
      (password: string) => password.trim().length > 0,
    );
    if (!password) {
      password = await this.getPasswordInteractively();
    }
    return password;
  };

  public getTwoFactorCode = async (twoFactorFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    let twoFactor = CLIUtils.getValueFromFlag(
      {
        value: twoFactorFlag,
        name: Login.flags['twofactor'].name,
        error: new NotValidTwoFactorCodeError(),
      },
      nonInteractive,
      ValidationService.instance.validate2FA,
    );
    if (!twoFactor) {
      twoFactor = await this.getTwoFactorCodeInteractively();
    }
    return twoFactor;
  };

  // max of attempts to let the user rewrite their credentials in case of mistake
  private static readonly MAX_ATTEMPTS = 3;

  public getEmailInteractively = (): Promise<string> => {
    return CLIUtils.promptWithAttempts(
      {
        message: 'What is your email?',
        options: { required: true },
        error: new NotValidEmailError(),
      },
      Login.MAX_ATTEMPTS,
      ValidationService.instance.validateEmail,
    );
  };

  public getPasswordInteractively = (): Promise<string> => {
    return CLIUtils.promptWithAttempts(
      {
        message: 'What is your password?',
        options: { type: 'hide', required: true },
        error: new EmptyPasswordError(),
      },
      Login.MAX_ATTEMPTS,
      (password: string) => password.trim().length > 0,
    );
  };

  public getTwoFactorCodeInteractively = (): Promise<string> => {
    return CLIUtils.promptWithAttempts(
      {
        message: 'What is your two-factor token?',
        options: { type: 'mask', required: true },
        error: new NotValidTwoFactorCodeError(),
      },
      Login.MAX_ATTEMPTS,
      ValidationService.instance.validate2FA,
    );
  };
}
