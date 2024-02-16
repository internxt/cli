import { Command, ux } from '@oclif/core';
import { AuthService } from '../services/auth.service';

export default class Login extends Command {
  static args = {};
  static description = 'Asks user for email and password, (and 2fa if needed) for log in.';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  static flags = {};

  public async run(): Promise<void> {
    try {
      const email = await ux.prompt('What is your email?');
      const password = await ux.prompt('What is your password?', { type: 'hide' });
      let twoFactorCode: string | undefined = undefined;

      const is2FANeeded = await AuthService.instance.is2FANeeded(email);
      this.log(`2FA needed: ${is2FANeeded}`);
      if (is2FANeeded) {
        twoFactorCode = await ux.prompt('What is your two-factor token?', { type: 'mask' });
        //check Validate2FA https://github.com/internxt/drive-mobile/blob/master/src/services/ValidationService.ts
      }

      const userCrendentials = await AuthService.instance.doLogin(email, password, twoFactorCode);
      this.logJson({ userCrendentials });
    } catch (err) {
      if (err instanceof Error) this.log('Error: ' + err.message + ' ' + err.stack);
    }
  }
}
