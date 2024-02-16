import { validateMnemonic } from 'bip39';
import { ConfigService } from '../services/config.service';
export class CryptoUtils {
  static validateMnemonic(mnemonic: string): boolean {
    return validateMnemonic(mnemonic);
  }

  static getAesInitFromEnv(): { iv: string; salt: string } {
    return { iv: ConfigService.instance.get('APP_MAGIC_IV'), salt: ConfigService.instance.get('APP_MAGIC_SALT') };
  }
}
