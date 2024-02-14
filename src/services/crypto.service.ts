import { CryptoProvider } from '@internxt/sdk';
import { Keys, Password } from '@internxt/sdk/dist/auth';
import { KeysService } from './keys.service';
import { ConfigService } from '../services/config.service';

interface PassObjectInterface {
  salt?: string | null;
  password: string;
}

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
  public passToHash = (passObject: PassObjectInterface): { salt: string; hash: string } => {
    const salt = passObject.salt ? CryptoJS.enc.Hex.parse(passObject.salt) : CryptoJS.lib.WordArray.random(128 / 8);
    const hash = CryptoJS.PBKDF2(passObject.password, salt, { keySize: 256 / 32, iterations: 10000 });
    const hashedObjetc = {
      salt: salt.toString(),
      hash: hash.toString(),
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

  // AES Plain text encryption method with enc. key
  public encryptTextWithKey = (textToEncrypt: string, keyToEncrypt: string): string => {
    const bytes = CryptoJS.AES.encrypt(textToEncrypt, keyToEncrypt).toString();
    const text64 = CryptoJS.enc.Base64.parse(bytes);

    return text64.toString(CryptoJS.enc.Hex);
  };

  // AES Plain text decryption method with enc. key
  public decryptTextWithKey = (encryptedText: string, keyToDecrypt: string): string => {
    const reb = CryptoJS.enc.Hex.parse(encryptedText);
    const bytes = CryptoJS.AES.decrypt(reb.toString(CryptoJS.enc.Base64), keyToDecrypt);

    return bytes.toString(CryptoJS.enc.Utf8);
  };
}
