import { Command } from '@oclif/core';
import { CLIUtils } from '../utils/cli.utils';
import { ConfigService } from '../services/config.service';
import { ValidationService } from '../services/validation.service';
import { LoginCredentials } from '../types/command.types';
import { AuthService } from '../services/auth.service';

export default class Whoami extends Command {
  static readonly args = {};
  static readonly description = 'Display the current user logged into the Internxt CLI.';
  static readonly aliases = [];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {};
  static readonly enableJsonFlag = true;

  public run = async () => {
    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) {
      const message = 'You are not logged in.';
      CLIUtils.error(this.log.bind(this), message);
      return { success: false, message };
    } else {
      const validCreds = this.checkUserAndTokens(userCredentials);
      if (!validCreds.valid) {
        const message = 'Your session has expired. You have been logged out. Please log in again.';
        await ConfigService.instance.clearUser();
        CLIUtils.error(this.log.bind(this), message);
        return { success: false, message };
      } else {
        if (validCreds.refreshRequired) {
          try {
            await AuthService.instance.refreshUserToken(userCredentials.token, userCredentials.user.mnemonic);
          } catch {
            /* noop */
          }
        }
        const message = `You are logged in as: ${userCredentials.user.email}.`;
        CLIUtils.success(this.log.bind(this), message);
        return { success: true, message, login: userCredentials };
      }
    }
  };

  public catch = async (error: Error) => {
    const { flags } = await this.parse(Whoami);
    CLIUtils.catchError({
      error,
      command: this.id,
      logReporter: this.log.bind(this),
      jsonFlag: flags['json'],
    });
    this.exit(1);
  };

  private checkUserAndTokens = (loginCreds: LoginCredentials): { valid: boolean; refreshRequired: boolean } => {
    if (!(loginCreds?.token && loginCreds?.user?.mnemonic)) {
      return { valid: false, refreshRequired: false };
    }
    const tokenDetails = ValidationService.instance.validateTokenAndCheckExpiration(loginCreds.token);
    const goodMnemonic = ValidationService.instance.validateMnemonic(loginCreds.user.mnemonic);
    const goodToken = tokenDetails.isValid && !tokenDetails.expiration.expired;

    return { valid: goodToken && goodMnemonic, refreshRequired: tokenDetails.expiration.refreshRequired };
  };
}
