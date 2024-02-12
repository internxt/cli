import { CryptoProvider, LoginDetails } from '@internxt/sdk';
import { Keys, Password } from '@internxt/sdk/dist/auth';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings.js';
import { aes } from '@internxt/lib';
import { SdkManager } from '../../../core/SDKManager.ts';
import { decryptText, decryptTextWithKey, encryptText, passToHash } from '../../crypto/services/utils.ts';
import { generateNewKeys } from '../../crypto/services/pgp.service.ts';
import {
  assertPrivateKeyIsValid,
  assertValidateKeys,
  decryptPrivateKey,
  getAesInitFromEnv,
} from '../../crypto/services/keys.service.ts';

const generateNewKeysWithEncrypted = async (password: string) => {
  const { privateKeyArmored, publicKeyArmored, revocationCertificate } = await generateNewKeys();

  return {
    privateKeyArmored,
    privateKeyArmoredEncrypted: aes.encrypt(privateKeyArmored, password, getAesInitFromEnv()),
    publicKeyArmored,
    revocationCertificate,
  };
};

export const is2FANeeded = async (email: string): Promise<boolean> => {
  const authClient = SdkManager.getInstance().auth;
  const securityDetails = await authClient.securityDetails(email).catch((error) => {
    throw new Error(error.message ?? 'Login error');
  });
  return securityDetails.tfaEnabled;
};

export const doLogin = async (
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
        await generateNewKeysWithEncrypted(password);
      const keys: Keys = {
        privateKeyEncrypted: privateKeyArmoredEncrypted,
        publicKey: publicKeyArmored,
        revocationCertificate: revocationCertificate,
      };
      return keys;
    },
  };

  return authClient
    .login(loginDetails, cryptoProvider)
    .then(async (data) => {
      const { user, token, newToken } = data;
      const { privateKey, publicKey } = user;

      const plainPrivateKeyInBase64 = privateKey
        ? Buffer.from(decryptPrivateKey(privateKey, password)).toString('base64')
        : '';

      if (privateKey) {
        await assertPrivateKeyIsValid(privateKey, password);
        await assertValidateKeys(
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

      //TODO save tokens for later use
      /*localStorageService.set('xToken', token);
                  localStorageService.set('xMnemonic', clearMnemonic);
                  localStorageService.set('xNewToken', newToken);*/

      return {
        user: clearUser,
        token: token,
        newToken: newToken,
        mnemonic: clearMnemonic,
      };
    })
    .catch((error) => {
      throw error;
    });
};
