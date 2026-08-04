import { auth, TokenStatus } from '@internxt/lib';
import { validateMnemonic } from 'bip39';
import { validate as isValidUUID } from 'uuid';
import fs from 'node:fs/promises';

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

  public validateUUID = (uuid: string): boolean => {
    return isValidUUID(uuid);
  };

  public validateYesOrNoString = (message: string): boolean => {
    return message.length > 0 && /^(yes|no|y|n)$/i.test(message.trim());
  };

  public validateTCPIntegerPort = (port: string): boolean => {
    return /^\d+$/.test(port) && Number(port) >= 1 && Number(port) <= 65535;
  };

  public validateStringIsNotEmpty = (str: string): boolean => {
    return str.trim().length > 0;
  };

  public validateDirectoryExists = async (path: string): Promise<boolean> => {
    try {
      const directoryStat = await fs.stat(path);
      return directoryStat.isDirectory();
    } catch {
      return false;
    }
  };

  public validateFileExists = async (path: string): Promise<boolean> => {
    try {
      const fileStat = await fs.stat(path);
      return fileStat.isFile();
    } catch {
      return false;
    }
  };

  public validateTokenAndCheckExpiration = (token: string): TokenStatus => {
    return auth.validateTokenAndCheckExpiration(token);
  };
}
