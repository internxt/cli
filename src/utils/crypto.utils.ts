import CryptoJS from 'crypto-js';
import { ConfigService } from '../services/config.service';

interface PassObjectInterface {
  salt?: string | null;
  password: string;
}

// Method to hash password. If salt is passed, use it, in other case use crypto lib for generate salt
function passToHash(passObject: PassObjectInterface): { salt: string; hash: string } {
  const salt = passObject.salt ? CryptoJS.enc.Hex.parse(passObject.salt) : CryptoJS.lib.WordArray.random(128 / 8);
  const hash = CryptoJS.PBKDF2(passObject.password, salt, { keySize: 256 / 32, iterations: 10000 });
  const hashedObjetc = {
    salt: salt.toString(),
    hash: hash.toString(),
  };

  return hashedObjetc;
}

// AES Plain text encryption method
function encryptText(textToEncrypt: string): string {
  const REACT_APP_CRYPTO_SECRET = ConfigService.instance.get('REACT_APP_CRYPTO_SECRET');
  return encryptTextWithKey(textToEncrypt, REACT_APP_CRYPTO_SECRET);
}

// AES Plain text decryption method
function decryptText(encryptedText: string): string {
  const REACT_APP_CRYPTO_SECRET = ConfigService.instance.get('REACT_APP_CRYPTO_SECRET');
  return decryptTextWithKey(encryptedText, REACT_APP_CRYPTO_SECRET);
}

// AES Plain text encryption method with enc. key
function encryptTextWithKey(textToEncrypt: string, keyToEncrypt: string): string {
  const bytes = CryptoJS.AES.encrypt(textToEncrypt, keyToEncrypt).toString();
  const text64 = CryptoJS.enc.Base64.parse(bytes);

  return text64.toString(CryptoJS.enc.Hex);
}

// AES Plain text decryption method with enc. key
function decryptTextWithKey(encryptedText: string, keyToDecrypt: string): string {
  const reb = CryptoJS.enc.Hex.parse(encryptedText);
  const bytes = CryptoJS.AES.decrypt(reb.toString(CryptoJS.enc.Base64), keyToDecrypt);

  return bytes.toString(CryptoJS.enc.Utf8);
}

export { passToHash, encryptText, decryptText, encryptTextWithKey, decryptTextWithKey };
