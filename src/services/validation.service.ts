import { auth } from '@internxt/lib';
import { validateMnemonic } from 'bip39';
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

  public validateUUIDv4 = (uuid: string): boolean => {
    return /^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i.test(uuid);
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

  /**
   * Validates JWT token structure and parses the expiration claim.
   * Does not verify signature or issuer.
   * @returns Expiration timestamp in seconds, or null if invalid structure
   */
  public validateJwtAndCheckExpiration = (token?: string): number | null => {
    if (!token || typeof token !== 'string' || token.split('.').length !== 3) {
      return null;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return typeof payload.exp === 'number' ? payload.exp : null;
    } catch {
      return null;
    }
  };

  /**
   * Checks token expiration status.
   * @param expirationTimestamp - Unix timestamp in seconds
   * @returns Object indicating if token is expired or needs refresh (within 2 days)
   */
  public checkTokenExpiration = (
    expirationTimestamp: number,
  ): {
    expired: boolean;
    refreshRequired: boolean;
  } => {
    const TWO_DAYS_IN_SECONDS = 2 * 24 * 60 * 60;
    const currentTime = Math.floor(Date.now() / 1000);
    const remainingSeconds = expirationTimestamp - currentTime;

    return {
      expired: remainingSeconds <= 0,
      refreshRequired: remainingSeconds > 0 && remainingSeconds <= TWO_DAYS_IN_SECONDS,
    };
  };

  /**
   * Combined validation and expiration check for convenience.
   * For the original combined behavior, use this method.
   * For more granular control, use parseJwtExpiration + checkTokenExpiration separately.
   */
  public validateTokenAndCheckExpiration = (
    token?: string,
  ): {
    isValid: boolean;
    expiration: {
      expired: boolean;
      refreshRequired: boolean;
    };
  } => {
    const expiration = this.validateJwtAndCheckExpiration(token);
    return {
      isValid: expiration !== null,
      expiration: expiration ? this.checkTokenExpiration(expiration) : { expired: true, refreshRequired: false },
    };
  };
}
