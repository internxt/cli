import { ConfigService } from '../services/config.service';

export class CryptoUtils {
  static getAesInit(): { iv: string; salt: string } {
    return { iv: ConfigService.instance.get('APP_MAGIC_IV'), salt: ConfigService.instance.get('APP_MAGIC_SALT') };
  }
}
