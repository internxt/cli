import { auth } from '@internxt/lib';

export class ValidationService {
  public static readonly instance: ValidationService = new ValidationService();

  public validateEmail = (email: string): boolean => {
    return auth.isValidEmail(email);
  };

  public validate2FA = (code: string): boolean => {
    return /^[0-9]{6}$/.test(code);
  };

  public isStrongPassword = (pwd: string): boolean => {
    return /^(?=.*[a-zA-Z])(?=.*[0-9]).{6,}$/.test(pwd);
  };
}
