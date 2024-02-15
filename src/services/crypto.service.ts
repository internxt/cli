import { CryptoProvider } from '@internxt/sdk';
import { Keys, Password } from '@internxt/sdk/dist/auth';
import crypto from 'crypto';
import { KeysService } from './keys.service';
import { ConfigService } from '../services/config.service';

export class CryptoService {
  public static readonly instance: CryptoService = new CryptoService();

  public static readonly cryptoProvider: CryptoProvider = {
    encryptPasswordHash(password: Password, encryptedSalt: string): string {
      const salt = CryptoService.instance.decryptText(encryptedSalt);
      const hashObj = CryptoService.instance.passToHash({ password, salt });
      return CryptoService.instance.encryptText(hashObj.hash);
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

  // Method to hash password. If salt is passed, use it, in other case use crypto lib for generate salt
  public passToHash = (passObject: { salt?: string | null; password: string }): { salt: string; hash: string } => {
    const salt = passObject.salt ? passObject.salt : crypto.randomBytes(128 / 8).toString('hex');
    const hash = crypto.pbkdf2Sync(passObject.password, salt, 10000, 256 / 8, 'sha256').toString('hex');
    const hashedObjetc = {
      salt,
      hash,
    };
    return hashedObjetc;
  };

  // AES Plain text encryption method
  public encryptText = (textToEncrypt: string): string => {
    const APP_CRYPTO_SECRET = ConfigService.instance.get('APP_CRYPTO_SECRET');
    return this.encryptTextWithKey(textToEncrypt, APP_CRYPTO_SECRET);
  };

  // AES Plain text decryption method
  public decryptText = (encryptedText: string): string => {
    const APP_CRYPTO_SECRET = ConfigService.instance.get('APP_CRYPTO_SECRET');
    return this.decryptTextWithKey(encryptedText, APP_CRYPTO_SECRET);
  };

  /**
   * Encrypts a plain message into an AES encrypted text
   * [Crypto.JS compatible] (deprecated dependency)
   * @param textToEncrypt The plain text to be encrypted
   * @param secret The secret used to encrypt
   * @returns The encrypted private key in 'hex' encoding
   **/
  public encryptTextWithKey = (textToEncrypt: string, secret: string) => {
    const TRANSFORM_ROUNDS = 3;
    const openSSLstart = Buffer.from('Salted__');
    const salt = crypto.randomBytes(8);
    const password = Buffer.concat([Buffer.from(secret, 'binary'), salt]);
    const md5Hashes = [];

    let digest = password;

    for (let i = 0; i < TRANSFORM_ROUNDS; i++) {
      md5Hashes[i] = crypto.createHash('md5').update(digest).digest();
      digest = Buffer.concat([md5Hashes[i], password]);
    }

    const key = Buffer.concat([md5Hashes[0], md5Hashes[1]]);
    const iv = md5Hashes[2];
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    const encrypted = Buffer.concat([cipher.update(textToEncrypt, 'utf8'), cipher.final()]);
    return Buffer.concat([openSSLstart, salt, encrypted]).toString('hex');
  };

  /**
   * Decrypts an AES encrypted text
   * [Crypto.JS compatible] (deprecated dependency)
   * @param encryptedText The AES encrypted text in 'HEX' encoding
   * @param secret The secret used to encrypt
   * @returns The decrypted private key in 'utf8' encoding
   **/
  public decryptTextWithKey = (encryptedText: string, secret: string) => {
    const TRANSFORM_ROUNDS = 3;
    const cypher = Buffer.from(encryptedText, 'hex');
    const salt = cypher.subarray(8, 16);
    const password = Buffer.concat([Buffer.from(secret, 'binary'), salt]);
    const md5Hashes = [];

    let digest = password;

    for (let i = 0; i < TRANSFORM_ROUNDS; i++) {
      md5Hashes[i] = crypto.createHash('md5').update(digest).digest();
      digest = Buffer.concat([md5Hashes[i], password]);
    }

    const key = Buffer.concat([md5Hashes[0], md5Hashes[1]]);
    const iv = md5Hashes[2];
    const contents = cypher.subarray(16);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    return Buffer.concat([decipher.update(contents), decipher.final()]).toString('utf8');
  };
}
