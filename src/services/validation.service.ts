import { auth } from '@internxt/lib';
import { validateMnemonic } from 'bip39';
import fs from 'fs/promises';

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
    return message.length > 0 && /^(yes|no|y|n)$/i.test(message.trim());
  };

  public validateTCPIntegerPort = (port: string): boolean => {
    return /^\d+$/.test(port) && Number(port) >= 1 && Number(port) <= 65535;
  };

  public validateEmptyString = (str: string): boolean => {
    return str.trim().length > 0;
  };

  public validateDirectoryExists = async (path: string): Promise<boolean> => {
    const directoryStat = await fs.stat(path);
    return directoryStat.isDirectory();
  };

  public validateFileExists = async (path: string): Promise<boolean> => {
    const fileStat = await fs.stat(path);
    return fileStat.isFile();
  };
}
