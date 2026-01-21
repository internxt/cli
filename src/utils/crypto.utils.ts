import { blake3 } from 'hash-wasm';
import { ConfigService } from '../services/config.service';

export class CryptoUtils {
  static readonly getAesInit = (): { iv: string; salt: string } => {
    return { iv: ConfigService.instance.get('APP_MAGIC_IV'), salt: ConfigService.instance.get('APP_MAGIC_SALT') };
  };

  /**
   * Extends the given secret to the required number of bits
   * @param {string} secret - The original secret
   * @param {number} length - The desired bitlength
   * @returns {Promise<string>} The extended secret of the desired bitlength
   */
  static readonly extendSecret = (secret: Uint8Array, length: number): Promise<string> => {
    return blake3(secret, length);
  };

  /**
   * XORs two strings of the identical length
   * @param {string} a - The first string
   * @param {string} b - The second string
   * @returns {string} The result of XOR of strings a and b.
   */
  static readonly XORhex = (a: string, b: string): string => {
    let res = '',
      i = a.length,
      j = b.length;
    if (i != j) {
      throw new Error('Can XOR only strings with identical length');
    }
    while (i-- > 0 && j-- > 0)
      res = (Number.parseInt(a.charAt(i), 16) ^ Number.parseInt(b.charAt(j), 16)).toString(16) + res;
    return res;
  };
}
