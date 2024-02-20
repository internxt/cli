import { LoginDetails } from '@internxt/sdk';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings.js';
import { SdkManager } from './sdk-manager.service';
import { KeysService } from './keys.service';
import { CryptoService } from './crypto.service';
import { ConfigService } from './config.service';
import { CryptoUtils } from '../utils/crypto.utils';

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
  public doLogin = async (
    email: string,
    password: string,
    twoFactorCode?: string,
  ): Promise<{
    user: UserSettings;
    token: string;
    newToken: string;
    mnemonic: string;
  }> => {
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
      mnemonic: clearMnemonic,
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
   * Obtains the current logged in user
   *
   * @returns The current user
   */
  public getUser = async () => {
    const usersClient = SdkManager.instance.getUsers();

    const { user } = await usersClient.refreshUser();

    return user;
  };

  /**
   * Obtains the user auth details
   *
   * @returns The user plain mnemonic and the auth tokens
   */

  public getAuthDetails(): { token: string; newToken: string; mnemonic: string } {
    /**
     * DEV PURPOSE ONLY
     *
     * We are using this method to get the auth details for the user from the env, in
     * production we should pull this data from a locally persisted file
     */
    const token = ConfigService.instance.get('DEV_AUTH_TOKEN');
    const newToken = ConfigService.instance.get('DEV_NEW_AUTH_TOKEN');
    const mnemonic = ConfigService.instance.get('DEV_MNEMONIC');

    if (!token) {
      throw new Error('Auth token not found, please login first');
    }

    if (!newToken) {
      throw new Error('New Auth token not found, please login first');
    }

    if (!mnemonic) {
      throw new Error('Mnemonic not found, please login first');
    }

    if (!CryptoUtils.validateMnemonic(mnemonic)) {
      throw new Error('Mnemonic is not valid, cannot use it');
    }

    return {
      token,
      newToken,
      mnemonic,
    };
  }
}
