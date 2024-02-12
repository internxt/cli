import { Auth, Drive, photos } from '@internxt/sdk';
import { Trash } from '@internxt/sdk/dist/drive';
import { ApiSecurity, AppDetails } from '@internxt/sdk/dist/shared';
import packageJson from '../../../package.json';
import { NoEnvDefined } from './SDKExceptions';

export type SdkManagerApiSecurity = ApiSecurity & { newToken: string };
/**
 * Manages all the sdk submodules initialization
 * based on the current apiSecurity details
 */
export class SdkManager {
  private static apiSecurity?: SdkManagerApiSecurity = undefined;
  private static instance: SdkManager = new SdkManager();
  /**
   *  Sets the security details needed to create SDK clients
   * @param apiSecurity Security properties to be setted
   */
  static init(apiSecurity: SdkManagerApiSecurity) {
    SdkManager.setApiSecurity(apiSecurity);
  }

  static setApiSecurity(apiSecurity: SdkManagerApiSecurity) {
    SdkManager.apiSecurity = apiSecurity;
  }

  static clean() {
    SdkManager.apiSecurity = undefined;
  }

  static getInstance() {
    if (!SdkManager.instance) {
      throw new Error('No instance found, call init method first');
    }
    return SdkManager.instance;
  }

  public getApiSecurity(config = { throwErrorOnMissingCredentials: true }): SdkManagerApiSecurity {
    if (!SdkManager.apiSecurity && config.throwErrorOnMissingCredentials)
      throw new Error('Api security properties not found in SdkManager');

    return SdkManager.apiSecurity as SdkManagerApiSecurity;
  }

  private static getAppDetails(): AppDetails {
    return {
      clientName: packageJson.name,
      clientVersion: packageJson.version,
    };
  }

  /** Auth SDK */
  get authV2() {
    if (!process.env.DRIVE_NEW_API_URL) {
      throw new NoEnvDefined('DRIVE_NEW_API_URL');
    }

    const apiSecurity = this.getApiSecurity({ throwErrorOnMissingCredentials: false });
    const appDetails = SdkManager.getAppDetails();

    return Auth.client(process.env.DRIVE_NEW_API_URL, appDetails, apiSecurity);
  }

  /** Auth old client SDK */
  get auth() {
    if (!process.env.DRIVE_API_URL) {
      throw new NoEnvDefined('DRIVE_API_URL');
    }

    const apiSecurity = this.getApiSecurity({ throwErrorOnMissingCredentials: false });
    const appDetails = SdkManager.getAppDetails();

    return Auth.client(process.env.DRIVE_API_URL, appDetails, apiSecurity);
  }

  /** Payments SDK */
  get payments() {
    if (!process.env.PAYMENTS_API_URL) {
      throw new NoEnvDefined('PAYMENTS_API_URL');
    }

    const newToken = this.getApiSecurity().newToken;
    const appDetails = SdkManager.getAppDetails();

    return Drive.Payments.client(process.env.PAYMENTS_API_URL, appDetails, {
      // Weird, normal accessToken doesn't work here
      token: newToken,
    });
  }

  /** Users SDK */
  get users() {
    if (!process.env.DRIVE_API_URL) {
      throw new NoEnvDefined('DRIVE_API_URL');
    }

    const apiSecurity = this.getApiSecurity({ throwErrorOnMissingCredentials: false });
    const appDetails = SdkManager.getAppDetails();

    return Drive.Users.client(process.env.DRIVE_API_URL, appDetails, apiSecurity);
  }

  /** Referrals SDK */
  get referrals() {
    if (!process.env.DRIVE_API_URL) {
      throw new NoEnvDefined('DRIVE_API_URL');
    }

    const apiSecurity = this.getApiSecurity();
    const appDetails = SdkManager.getAppDetails();

    return Drive.Referrals.client(process.env.DRIVE_API_URL, appDetails, apiSecurity);
  }

  /** Storage SDK */
  get storage() {
    if (!process.env.DRIVE_API_URL) {
      throw new NoEnvDefined('DRIVE_API_URL');
    }

    const apiSecurity = this.getApiSecurity();
    const appDetails = SdkManager.getAppDetails();

    return Drive.Storage.client(process.env.DRIVE_API_URL, appDetails, apiSecurity);
  }

  /** Trash SDK */
  get trash() {
    if (!process.env.DRIVE_NEW_API_URL) {
      throw new NoEnvDefined('DRIVE_NEW_API_URL');
    }

    const newToken = this.getApiSecurity().newToken;
    const appDetails = SdkManager.getAppDetails();

    return Trash.client(process.env.DRIVE_NEW_API_URL, appDetails, {
      // Weird, normal accessToken doesn't work here
      token: newToken,
    });
  }

  /** Photos SDK */
  get photos() {
    if (!process.env.PHOTOS_API_URL) {
      throw new NoEnvDefined('PHOTOS_API_URL');
    }

    const newToken = this.getApiSecurity().newToken;
    return new photos.Photos(process.env.PHOTOS_API_URL, newToken);
  }

  /** Share SDK */
  get share() {
    if (!process.env.DRIVE_NEW_API_URL) {
      throw new NoEnvDefined('DRIVE_NEW_API_URL');
    }

    const newToken = this.getApiSecurity().newToken;
    const appDetails = SdkManager.getAppDetails();

    return Drive.Share.client(process.env.DRIVE_NEW_API_URL, appDetails, {
      // Weird, normal accessToken doesn't work here
      token: newToken,
    });
  }
}
