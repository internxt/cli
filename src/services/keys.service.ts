import { aes } from '@internxt/lib';
import * as openpgp from 'openpgp';
import { CryptoUtils } from '../utils/crypto.utils';

export class KeysService {
  public static readonly instance: KeysService = new KeysService();

  /**
   * Encrypts a private key using a password
   * @param privateKey The plain private key
   * @param password The password to encrypt
   * @returns The encrypted private key
   **/
  public encryptPrivateKey = (privateKey: string, password: string): string => {
    return aes.encrypt(privateKey, password, CryptoUtils.getAesInit());
  };

  /**
   * Decrypts a private key using a password
   * @param privateKey The encrypted private key
   * @param password The password used to encrypt the private key
   * @returns The decrypted private key
   **/
  public decryptPrivateKey = (privateKey: string, password: string): string => {
    return aes.decrypt(privateKey, password);
  };

  /**
   * Generates pgp keys adding an AES-encrypted private key property by using a password
   * @param password The password for encrypting the private key
   * @returns The keys { privateKeyArmored, privateKeyArmoredEncrypted, publicKeyArmored, revocationCertificate }
   * @async
   **/
  public generateNewKeysWithEncrypted = async (password: string) => {
    const { privateKey, publicKey, revocationCertificate } = await openpgp.generateKey({
      userIDs: [{ email: 'inxt@inxt.com' }],
      curve: 'ed25519Legacy',
    });

    return {
      privateKeyArmored: privateKey,
      privateKeyArmoredEncrypted: this.encryptPrivateKey(privateKey, password),
      publicKeyArmored: Buffer.from(publicKey).toString('base64'),
      revocationCertificate: Buffer.from(revocationCertificate).toString('base64'),
    };
  };
}
