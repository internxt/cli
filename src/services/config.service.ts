import { ConfigKeys } from '../types/config.types';
export class ConfigService {
  public static readonly instance: ConfigService = new ConfigService();

  get(key: keyof ConfigKeys): string {
    const value = process.env[key];
    if (!value) throw new Error(`Config key ${key} was not found in process.env`);
    return value;
  }
}
