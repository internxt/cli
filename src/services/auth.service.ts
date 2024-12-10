import { LoginDetails } from '@internxt/sdk';
import { SdkManager } from './sdk-manager.service';
import { KeysService } from './keys.service';
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

    const data = await authClient.login(loginDetails, CryptoService.cryptoProvider);
    const { user, token, newToken } = data;
    const { privateKey, publicKey } = user;

    const plainPrivateKeyInBase64 = privateKey
      ? Buffer.from(KeysService.instance.decryptPrivateKey(privateKey, password)).toString('base64')
      : '';

    if (privateKey) {
      await KeysService.instance.assertPrivateKeyIsValid(privateKey, password);
      await KeysService.instance.assertValidateKeys(
        Buffer.from(plainPrivateKeyInBase64, 'base64').toString(),
        Buffer.from(publicKey, 'base64').toString(),
      );
    }

    const clearMnemonic = CryptoService.instance.decryptTextWithKey(user.mnemonic, password);
    const clearUser = {
      ...user,
      mnemonic: clearMnemonic,
      privateKey: plainPrivateKeyInBase64,
    };
    return {
      user: clearUser,
      token: token,
      newToken: newToken,
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
   * Obtains the user auth details
   *
   * @returns The user details and the auth tokens
   */
  public getAuthDetails = async (): Promise<LoginCredentials> => {
    let loginCreds = await ConfigService.instance.readUser();
    if (!(loginCreds?.newToken && loginCreds?.token && loginCreds?.user?.mnemonic)) {
      throw new MissingCredentialsError();
    }

    const oldTokenDetails = ValidationService.instance.validateTokenAndCheckExpiration(loginCreds.token);
    const newTokenDetails = ValidationService.instance.validateTokenAndCheckExpiration(loginCreds.newToken);
    const isValidMnemonic = ValidationService.instance.validateMnemonic(loginCreds.user.mnemonic);
    if (!(oldTokenDetails.isValid && newTokenDetails.isValid && isValidMnemonic)) {
      throw new InvalidCredentialsError();
    }

    if (oldTokenDetails.expiration.expired || newTokenDetails.expiration.expired) {
      throw new ExpiredCredentialsError();
    }

    const refreshOldToken = !oldTokenDetails.expiration.expired && oldTokenDetails.expiration.refreshRequired;
    const refreshNewToken = !newTokenDetails.expiration.expired && newTokenDetails.expiration.refreshRequired;

    if (refreshOldToken || refreshNewToken) {
      loginCreds = await this.refreshUserTokens(loginCreds);
    }
    return loginCreds;
  };

  /**
   * Refreshes the user auth details
   *
   * @returns The user details and its auth tokens
   */
  public refreshUserTokens = async (oldCreds: LoginCredentials): Promise<LoginCredentials> => {
    const usersClient = SdkManager.instance.getUsers(true);
    const newCreds = await usersClient.getUserData({ userUuid: oldCreds.user.uuid });

    const loginCreds = {
      user: {
        ...newCreds.user,
        mnemonic: oldCreds.user.mnemonic,
        privateKey: oldCreds.user.privateKey,
      },
      token: newCreds.oldToken,
      newToken: newCreds.newToken,
      lastLoggedInAt: oldCreds.lastLoggedInAt,
      lastTokenRefreshAt: new Date().toISOString(),
    };
    return loginCreds;
  };
}
