import { CryptoProvider, LoginDetails } from '@internxt/sdk';
import { Keys, Password } from '@internxt/sdk/dist/auth';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings.js';
import { SdkManager } from './SDKManager.service';
import { KeysService } from './keys.service';
import { decryptText, decryptTextWithKey, encryptText, passToHash } from '../utils/crypto.utils';

export class AuthService {
  public static readonly instance: AuthService = new AuthService();

  public doLogin = async (
    email: string,
    password: string,
    twoFactorCode: string,
  ): Promise<{
    user: UserSettings;
    token: string;
    newToken: string;
    mnemonic: string;
  }> => {
    const authClient = SdkManager.getInstance().auth;
    const loginDetails: LoginDetails = {
      email: email.toLowerCase(),
      password: password,
      tfaCode: twoFactorCode,
    };
    const cryptoProvider: CryptoProvider = {
      encryptPasswordHash(password: Password, encryptedSalt: string): string {
        const salt = decryptText(encryptedSalt);
        const hashObj = passToHash({ password, salt });
        return encryptText(hashObj.hash);
      },
      async generateKeys(password: Password): Promise<Keys> {
        const { privateKeyArmoredEncrypted, publicKeyArmored, revocationCertificate } =
          await KeysService.instance.generateNewKeysWithEncrypted(password);
        const keys: Keys = {
          privateKeyEncrypted: privateKeyArmoredEncrypted,
          publicKey: publicKeyArmored,
          revocationCertificate: revocationCertificate,
        };
        return keys;
      },
    };

    // eslint-disable-next-line no-useless-catch
    try {
      const data = await authClient.login(loginDetails, cryptoProvider);
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

      const clearMnemonic = decryptTextWithKey(user.mnemonic, password);
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
    } catch (error) {
      //TODO send Sentry login errors and remove eslint-disable from this trycatch
      throw error;
    }
  };

  public is2FANeeded = async (email: string): Promise<boolean> => {
    const authClient = SdkManager.getInstance().auth;
    const securityDetails = await authClient.securityDetails(email).catch((error) => {
      throw new Error(error.message ?? 'Login error');
    });
    return securityDetails.tfaEnabled;
  };
}
