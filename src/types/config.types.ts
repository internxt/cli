export interface ConfigKeys {
  readonly DRIVE_API_URL: string;
  readonly DRIVE_NEW_API_URL: string;
  readonly PAYMENTS_API_URL: string;
  readonly PHOTOS_API_URL: string;
  readonly APP_CRYPTO_SECRET: string;
  readonly APP_MAGIC_IV: string;
  readonly APP_MAGIC_SALT: string;
}

export const CREDENTIALS_FILE = './dist/cli.inxt';
