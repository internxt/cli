import CryptoJS from 'crypto-js';
import { ConfigService } from '../services/config.service';

interface PassObjectInterface {
  salt?: string | null;
  password: string;
}

// Method to hash password. If salt is passed, use it, in other case use crypto lib for generate salt
export const passToHash = (passObject: PassObjectInterface): { salt: string; hash: string } => {
  const salt = passObject.salt ? CryptoJS.enc.Hex.parse(passObject.salt) : CryptoJS.lib.WordArray.random(128 / 8);
  const hash = CryptoJS.PBKDF2(passObject.password, salt, { keySize: 256 / 32, iterations: 10000 });
  const hashedObjetc = {
    salt: salt.toString(),
    hash: hash.toString(),
  };

  return hashedObjetc;
};

// AES Plain text encryption method
export const encryptText = (textToEncrypt: string): string => {
  const APP_CRYPTO_SECRET = ConfigService.instance.get('APP_CRYPTO_SECRET');
  return encryptTextWithKey(textToEncrypt, APP_CRYPTO_SECRET);
};

// AES Plain text decryption method
export const decryptText = (encryptedText: string): string => {
  const APP_CRYPTO_SECRET = ConfigService.instance.get('APP_CRYPTO_SECRET');
  return decryptTextWithKey(encryptedText, APP_CRYPTO_SECRET);
};

// AES Plain text encryption method with enc. key
export const encryptTextWithKey = (textToEncrypt: string, keyToEncrypt: string): string => {
  const bytes = CryptoJS.AES.encrypt(textToEncrypt, keyToEncrypt).toString();
  const text64 = CryptoJS.enc.Base64.parse(bytes);

  return text64.toString(CryptoJS.enc.Hex);
};

// AES Plain text decryption method with enc. key
export const decryptTextWithKey = (encryptedText: string, keyToDecrypt: string): string => {
  const reb = CryptoJS.enc.Hex.parse(encryptedText);
  const bytes = CryptoJS.AES.decrypt(reb.toString(CryptoJS.enc.Base64), keyToDecrypt);

  return bytes.toString(CryptoJS.enc.Utf8);
};
