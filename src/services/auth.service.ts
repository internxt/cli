import { LoginDetails } from '@internxt/sdk';
import { SdkManager } from './sdk-manager.service';
import { CryptoService } from './crypto.service';
import { ConfigService } from './config.service';
import {
  ExpiredCredentialsError,
  InvalidCredentialsError,
  LoginCredentials,
  MissingCredentialsError,
} from '../types/command.types';
import { ValidationService } from './validation.service';

export class AuthService {
  public static readonly instance: AuthService = new AuthService();

  /**
   * Login with user credentials and returns its tokens and properties
   * @param email The user's email
   * @param password The user's password
   * @param twoFactorCode (Optional) The temporal two factor auth code
   * @returns The user's properties and the tokens needed for auth
   * @async
   **/
  public doLogin = async (email: string, password: string, twoFactorCode?: string): Promise<LoginCredentials> => {
    const authClient = SdkManager.instance.getAuth();
    const loginDetails: LoginDetails = {
      email: email.toLowerCase(),
      password: password,
      tfaCode: twoFactorCode,
    };

    const data = await authClient.loginAccess(loginDetails, CryptoService.cryptoProvider);
    const { user, newToken } = data;

    const clearMnemonic = CryptoService.instance.decryptTextWithKey(user.mnemonic, password);
    const clearUser: LoginCredentials['user'] = {
      ...user,
      mnemonic: clearMnemonic,
    };
    return {
      user: clearUser,
      token: newToken,
      lastLoggedInAt: new Date().toISOString(),
      lastTokenRefreshAt: new Date().toISOString(),
    };
  };

  /**
   * Checks from user's security details if it has enabled two factor auth
   * @param email The user's email
   * @throws {Error} If auth.securityDetails endpoint fails
   * @returns True if user has enabled two factor auth
   * @async
   **/
  public is2FANeeded = async (email: string): Promise<boolean> => {
    const authClient = SdkManager.instance.getAuth();
    const securityDetails = await authClient.securityDetails(email).catch((error) => {
      throw new Error(error.message ?? 'Login error');
    });
    return securityDetails.tfaEnabled;
  };

  /**
   * Checks and returns the user auth details (it refreshes the tokens if needed)
   *
   * @returns The user details and the auth tokens
   */
  public getAuthDetails = async (): Promise<LoginCredentials> => {
    let loginCreds = await ConfigService.instance.readUser();
    if (!loginCreds?.token || !loginCreds?.user?.mnemonic) {
      throw new MissingCredentialsError();
    }

    const tokenDetails = ValidationService.instance.validateTokenAndCheckExpiration(loginCreds.token);
    const isValidMnemonic = ValidationService.instance.validateMnemonic(loginCreds.user.mnemonic);

    if (!tokenDetails.isValid || !isValidMnemonic) {
      throw new InvalidCredentialsError();
    }
    if (tokenDetails.expiration.expired) {
      throw new ExpiredCredentialsError();
    }

    const refreshToken = tokenDetails.expiration.refreshRequired;
    if (refreshToken) {
      loginCreds = await this.refreshUserToken(loginCreds);
    }

    return loginCreds;
  };

  /**
   * Refreshes the user auth details
   *
   * @returns The user details and its renewed auth token
   */
  public refreshUserDetails = async (oldCreds: LoginCredentials): Promise<LoginCredentials> => {
    SdkManager.init({ token: oldCreds.token });
    const usersClient = SdkManager.instance.getUsers();
    const newCreds = await usersClient.getUserData({ userUuid: oldCreds.user.uuid });

    const loginCreds: LoginCredentials = {
      user: {
        ...newCreds.user,
        mnemonic: oldCreds.user.mnemonic,
        createdAt: new Date(newCreds.user.createdAt).toISOString(),
      },
      token: newCreds.newToken,
      lastLoggedInAt: oldCreds.lastLoggedInAt,
      lastTokenRefreshAt: new Date().toISOString(),
    };
    SdkManager.init({ token: newCreds.newToken });
    await ConfigService.instance.saveUser(loginCreds);
    return loginCreds;
  };

  /**
   * Refreshes the user tokens
   *
   * @returns The user details and its renewed auth token
   */
  public refreshUserToken = async (oldCreds: LoginCredentials): Promise<LoginCredentials> => {
    SdkManager.init({ token: oldCreds.token });

    const usersClient = SdkManager.instance.getUsers();
    const newCreds = await usersClient.refreshUser();

    SdkManager.init({ token: newCreds.newToken });

    const newLoginCreds: LoginCredentials = {
      ...oldCreds,
      token: newCreds.newToken,
      lastLoggedInAt: oldCreds.lastLoggedInAt,
      lastTokenRefreshAt: new Date().toISOString(),
    };

    await ConfigService.instance.saveUser(newLoginCreds);
    return newLoginCreds;
  };

  /**
   * Logs the user out of the application by invoking the logout method
   * from the authentication client. This will terminate the user's session
   * and clear any associated authentication data.
   *
   * @returns A promise that resolves when the logout process is complete.
   */
  public logout = async (): Promise<void> => {
    try {
      const user = await ConfigService.instance.readUser();
      if (!user || !user.token) {
        return;
      }
      const authClient = SdkManager.instance.getAuth();
      return authClient.logout(user.token);
    } catch {
      //no op
    }
  };
}
