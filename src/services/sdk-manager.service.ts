import { Auth, Drive, photos, Network as NetworkModule } from '@internxt/sdk';
import { Trash } from '@internxt/sdk/dist/drive';
import { ApiSecurity, AppDetails } from '@internxt/sdk/dist/shared';
import { ConfigService } from './config.service';
import packageJson from '../../package.json';
import { NetworkUtils } from '../utils/network.utils';

export type SdkManagerApiSecurity = ApiSecurity & { newToken: string };
/**
 * Manages all the sdk submodules initialization
 * based on the current apiSecurity details
 */
export class SdkManager {
  public static readonly instance: SdkManager = new SdkManager();
  private static apiSecurity?: SdkManagerApiSecurity;

  /**
   * Sets the security details needed to create SDK clients
   * @param apiSecurity Security properties to be setted
   **/
  public static readonly init = (apiSecurity: SdkManagerApiSecurity) => {
    SdkManager.apiSecurity = apiSecurity;
  };

  /**
   * Cleans the security details
   **/
  public static readonly clean = () => {
    SdkManager.apiSecurity = undefined;
  };

  /**
   * Returns the security details needed to create SDK clients
   * @param config Config object to handle error throwing when there is not apiSecurity defined
   * @throws {Error} When throwErrorOnMissingCredentials is setted to true and there is not apiSecurity defined
   * @returns The SDK Manager api security details
   **/
  public static readonly getApiSecurity = (
    config = { throwErrorOnMissingCredentials: true },
  ): SdkManagerApiSecurity => {
    if (!SdkManager.apiSecurity && config.throwErrorOnMissingCredentials)
      throw new Error('Api security properties not found in SdkManager');

    return SdkManager.apiSecurity as SdkManagerApiSecurity;
  };

  /**
   * Returns the application details from package.json
   * @returns The name and the version of the app from package.json
   **/
  public static readonly getAppDetails = (): AppDetails => {
    return {
      clientName: packageJson.name,
      clientVersion: packageJson.version,
    };
  };

  /** Auth SDK */
  getAuthV2() {
    const DRIVE_NEW_API_URL = ConfigService.instance.get('DRIVE_NEW_API_URL');

    const apiSecurity = SdkManager.getApiSecurity({ throwErrorOnMissingCredentials: false });
    const appDetails = SdkManager.getAppDetails();

    return Auth.client(DRIVE_NEW_API_URL, appDetails, apiSecurity);
  }

  /** Auth old client SDK */
  getAuth() {
    const DRIVE_API_URL = ConfigService.instance.get('DRIVE_API_URL');

    const apiSecurity = SdkManager.getApiSecurity({ throwErrorOnMissingCredentials: false });
    const appDetails = SdkManager.getAppDetails();

    return Auth.client(DRIVE_API_URL, appDetails, apiSecurity);
  }

  /** Payments SDK */
  getPayments() {
    const PAYMENTS_API_URL = ConfigService.instance.get('PAYMENTS_API_URL');

    const newToken = SdkManager.getApiSecurity().newToken;
    const appDetails = SdkManager.getAppDetails();

    return Drive.Payments.client(PAYMENTS_API_URL, appDetails, {
      // Weird, normal accessToken doesn't work here
      token: newToken,
    });
  }

  /** Users SDK */
  getUsers() {
    const DRIVE_API_URL = ConfigService.instance.get('DRIVE_API_URL');

    const apiSecurity = SdkManager.getApiSecurity({ throwErrorOnMissingCredentials: false });
    const appDetails = SdkManager.getAppDetails();

    return Drive.Users.client(DRIVE_API_URL, appDetails, apiSecurity);
  }

  /** Referrals SDK */
  getReferrals() {
    const DRIVE_API_URL = ConfigService.instance.get('DRIVE_API_URL');

    const apiSecurity = SdkManager.getApiSecurity();
    const appDetails = SdkManager.getAppDetails();

    return Drive.Referrals.client(DRIVE_API_URL, appDetails, apiSecurity);
  }

  /** Storage SDK */
  getStorage(useNewApi = false) {
    const DRIVE_API_URL = useNewApi
      ? ConfigService.instance.get('DRIVE_NEW_API_URL')
      : ConfigService.instance.get('DRIVE_API_URL');

    const apiSecurity = SdkManager.getApiSecurity();
    const appDetails = SdkManager.getAppDetails();

    return Drive.Storage.client(DRIVE_API_URL, appDetails, {
      token: useNewApi ? apiSecurity.newToken : apiSecurity.token,
    });
  }

  /** Trash SDK */
  getTrash() {
    const DRIVE_NEW_API_URL = ConfigService.instance.get('DRIVE_NEW_API_URL');

    const newToken = SdkManager.getApiSecurity().newToken;
    const appDetails = SdkManager.getAppDetails();

    return Trash.client(DRIVE_NEW_API_URL, appDetails, {
      // Weird, normal accessToken doesn't work here
      token: newToken,
    });
  }

  /** Photos SDK */
  getPhotos() {
    const PHOTOS_API_URL = ConfigService.instance.get('PHOTOS_API_URL');

    const newToken = SdkManager.getApiSecurity().newToken;

    return new photos.Photos(PHOTOS_API_URL, newToken);
  }

  /** Share SDK */
  getShare() {
    const DRIVE_NEW_API_URL = ConfigService.instance.get('DRIVE_NEW_API_URL');

    const newToken = SdkManager.getApiSecurity().newToken;
    const appDetails = SdkManager.getAppDetails();

    return Drive.Share.client(DRIVE_NEW_API_URL, appDetails, {
      // Weird, normal accessToken doesn't work here
      token: newToken,
    });
  }

  /** Network SDK */
  getNetwork(credentials: { user: string; pass: string }) {
    const appDetails = SdkManager.getAppDetails();
    const auth = NetworkUtils.getAuthFromCredentials({
      user: credentials.user,
      pass: credentials.pass,
    });
    return NetworkModule.Network.client(ConfigService.instance.get('NETWORK_URL'), appDetails, {
      bridgeUser: auth.username,
      userId: auth.password,
    });
  }
}
