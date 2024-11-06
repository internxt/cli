import { auth } from '@internxt/lib';
import { validateMnemonic } from 'bip39';

export class ValidationService {
  public static readonly instance: ValidationService = new ValidationService();

  public validateEmail = (email: string): boolean => {
    return auth.isValidEmail(email);
  };

  public validate2FA = (code: string): boolean => {
    return /^\d{6}$/.test(code);
  };

  public validateMnemonic = (mnemonic: string): boolean => {
    return validateMnemonic(mnemonic);
  };

  public validateUUIDv4 = (uuid: string): boolean => {
    return /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i.test(uuid);
  };

  public validateYesOrNoString = (message: string): boolean => {
    return message.length > 0 && /^(yes|no|y|n)$/i.test(message.toLowerCase().trim());
  };

  public validateTCPIntegerPort = (port: string): boolean => {
    return /^\d+$/.test(port) && Number(port) >= 1 && Number(port) <= 65535;
  };
}
