import { Command, ux } from '@oclif/core';
import { AuthService } from '../services/auth.service';
import { ValidationService } from '../services/validation.service';

export default class Login extends Command {
  static args = {};
  static description = 'Asks user for email and password, (and 2fa if needed) for log in.';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  static flags = {};

  public async run(): Promise<void> {
    let email,
      password,
      twoFactorCode: string | undefined = undefined;
    const maxAttempts = 3; // max of attempts to let the user rewrite their credentials in case of mistake

    try {
      let currentAttempts = 0;
      let isValidEmail = false;
      do {
        email = await ux.prompt('What is your email?');
        isValidEmail = ValidationService.instance.validateEmail(email);
        if (!isValidEmail) {
          this.log('That is not a valid email, please try again');
          currentAttempts++;
        }
      } while (!isValidEmail && currentAttempts < maxAttempts);
      if (!isValidEmail) {
        return;
      }

      password = await ux.prompt('What is your password?', { type: 'hide', required: true });

      const is2FANeeded = await AuthService.instance.is2FANeeded(email);
      if (is2FANeeded) {
        currentAttempts = 0;
        let isValid2FAcode = false;
        do {
          twoFactorCode = await ux.prompt('What is your two-factor token?', { type: 'mask' });
          isValid2FAcode = ValidationService.instance.validate2FA(twoFactorCode);
          if (!isValid2FAcode) {
            this.log('That is not a valid two factor auth code, please try again with a six digit number');
            currentAttempts++;
          }
        } while (is2FANeeded && !isValid2FAcode && currentAttempts < maxAttempts);
        if (is2FANeeded && !isValid2FAcode) {
          return;
        }
      }

      const { token, newToken, mnemonic } = await AuthService.instance.doLogin(email, password, twoFactorCode);
      // save credentials
    } catch (err) {
      if (err instanceof Error) this.log('Error: ' + err.message);
    }
  }
}
