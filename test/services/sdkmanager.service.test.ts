import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
import { Auth, Drive, Network } from '@internxt/sdk';
import { Trash } from '@internxt/sdk/dist/drive';
import { SdkManager, SdkManagerApiSecurity } from '../../src/services/sdk-manager.service';
import { ConfigKeys } from '../../src/types/config.types';
import { ConfigService } from '../../src/services/config.service';
import { AppDetails } from '@internxt/sdk/dist/shared';
import packageJson from '../../package.json';
import { fail } from 'node:assert';
import { ApiSecurityFixture } from '../fixtures/login.fixture';

describe('SDKManager service', () => {
  const appDetails: AppDetails = {
    clientName: crypto.randomBytes(16).toString('hex'),
    clientVersion: crypto.randomBytes(16).toString('hex'),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When SDKManager ApiSecurityFixture is requested, then it is returned from static property', () => {
    const ApiSecurityFixture: SdkManagerApiSecurity = {
      newToken: crypto.randomBytes(16).toString('hex'),
      token: crypto.randomBytes(16).toString('hex'),
    };
    SdkManager.init(ApiSecurityFixture);

    expect(SdkManager.getApiSecurity()).to.be.deep.equal(ApiSecurityFixture);
  });

  it('When SDKManager ApiSecurityFixture is requested but it is not started, then an error is thrown', () => {
    try {
      SdkManager.getApiSecurity();
      fail('Expected function to throw an error, but it did not.');
    } catch {
      /* no op */
    }
  });

  it('When SDKManager is cleaned, then ApiSecurityFixture property is cleaned', () => {
    SdkManager.init(ApiSecurityFixture);
    SdkManager.clean();
    try {
      SdkManager.getApiSecurity({ throwErrorOnMissingCredentials: true });
      fail('Expected function to throw an error, but it did not.');
    } catch {
      /* no op */
    }
    const apiSecurityResponse = SdkManager.getApiSecurity({ throwErrorOnMissingCredentials: false });
    expect(apiSecurityResponse).to.be.equal(undefined);
  });

  it('When getAppDetails is requested, then it is generated using packageJson values', () => {
    const expectedAppdetails = {
      clientName: packageJson.clientName,
      clientVersion: packageJson.version,
    };
    /*vi.spyOn(packageJson, 'name').mockReturnValue(appDetails.clientName);
    vi.spyOn(packageJson, 'version').mockReturnValue(appDetails.clientVersion);*/

    const appDetailsResponse = SdkManager.getAppDetails();
    expect(expectedAppdetails).to.be.deep.equal(appDetailsResponse);
  });

  it('When Auth client is requested, then it returns the sdk that uses the new API endpoint', () => {
    const envEndpoint: { key: keyof ConfigKeys; value: string } = {
      key: 'DRIVE_NEW_API_URL',
      value: 'test/new-api',
    };
    SdkManager.init(ApiSecurityFixture);

    const authClient = Auth.client(envEndpoint.value, appDetails, ApiSecurityFixture);

    const spyConfigService = vi.spyOn(ConfigService.instance, 'get').mockReturnValue(envEndpoint.value);
    vi.spyOn(SdkManager, 'getApiSecurity').mockReturnValue(ApiSecurityFixture);
    vi.spyOn(SdkManager, 'getAppDetails').mockReturnValue(appDetails);
    vi.spyOn(Auth, 'client').mockReturnValue(authClient);

    const auth = SdkManager.instance.getAuth();

    expect(spyConfigService).toHaveBeenCalledWith(envEndpoint.key);
    expect(auth).to.be.deep.equal(authClient);
  });

  it('When Users client is requested, then it is generated using internxt sdk', () => {
    const envEndpoint: { key: keyof ConfigKeys; value: string } = {
      key: 'DRIVE_NEW_API_URL',
      value: 'test/api',
    };
    SdkManager.init(ApiSecurityFixture);

    const client = Drive.Users.client(envEndpoint.value, appDetails, ApiSecurityFixture);

    const spyConfigService = vi.spyOn(ConfigService.instance, 'get').mockReturnValue(envEndpoint.value);
    vi.spyOn(SdkManager, 'getApiSecurity').mockReturnValue(ApiSecurityFixture);
    vi.spyOn(SdkManager, 'getAppDetails').mockReturnValue(appDetails);
    vi.spyOn(Drive.Users, 'client').mockReturnValue(client);

    const newClient = SdkManager.instance.getUsers();

    expect(spyConfigService).toHaveBeenCalledWith(envEndpoint.key);
    expect(newClient).to.be.deep.equal(client);
  });

  it('When Storage client is requested, then it is generated using internxt sdk', () => {
    const envEndpoint: { key: keyof ConfigKeys; value: string } = {
      key: 'DRIVE_NEW_API_URL',
      value: 'test/api',
    };
    SdkManager.init(ApiSecurityFixture);

    const client = Drive.Storage.client(envEndpoint.value, appDetails, ApiSecurityFixture);

    const spyConfigService = vi.spyOn(ConfigService.instance, 'get').mockReturnValue(envEndpoint.value);
    vi.spyOn(SdkManager, 'getApiSecurity').mockReturnValue(ApiSecurityFixture);
    vi.spyOn(SdkManager, 'getAppDetails').mockReturnValue(appDetails);
    vi.spyOn(Drive.Storage, 'client').mockReturnValue(client);

    const newClient = SdkManager.instance.getStorage();

    expect(spyConfigService).toHaveBeenCalledWith(envEndpoint.key);
    expect(newClient).to.be.deep.equal(client);
  });

  it('When Trash client is requested, then it is generated using internxt sdk', () => {
    const envEndpoint: { key: keyof ConfigKeys; value: string } = {
      key: 'DRIVE_NEW_API_URL',
      value: 'test/api',
    };
    SdkManager.init(ApiSecurityFixture);

    const client = Trash.client(envEndpoint.value, appDetails, ApiSecurityFixture);

    const spyConfigService = vi.spyOn(ConfigService.instance, 'get').mockReturnValue(envEndpoint.value);
    vi.spyOn(SdkManager, 'getApiSecurity').mockReturnValue(ApiSecurityFixture);
    vi.spyOn(SdkManager, 'getAppDetails').mockReturnValue(appDetails);
    vi.spyOn(Trash, 'client').mockReturnValue(client);

    const newClient = SdkManager.instance.getTrash();

    expect(spyConfigService).toHaveBeenCalledWith(envEndpoint.key);
    expect(newClient).to.be.deep.equal(client);
  });

  it('When Share client is requested, then it is generated using internxt sdk', () => {
    const envEndpoint: { key: keyof ConfigKeys; value: string } = {
      key: 'DRIVE_NEW_API_URL',
      value: 'test/api',
    };
    SdkManager.init(ApiSecurityFixture);

    const client = Drive.Share.client(envEndpoint.value, appDetails, ApiSecurityFixture);

    const spyConfigService = vi.spyOn(ConfigService.instance, 'get').mockReturnValue(envEndpoint.value);
    vi.spyOn(SdkManager, 'getApiSecurity').mockReturnValue(ApiSecurityFixture);
    vi.spyOn(SdkManager, 'getAppDetails').mockReturnValue(appDetails);
    vi.spyOn(Drive.Share, 'client').mockReturnValue(client);

    const newClient = SdkManager.instance.getShare();

    expect(spyConfigService).toHaveBeenCalledWith(envEndpoint.key);
    expect(newClient).to.be.deep.equal(client);
  });

  it('When Network client is requested, then it is generated using internxt sdk', () => {
    const envEndpoint: { key: keyof ConfigKeys; value: string } = {
      key: 'NETWORK_URL',
      value: 'test/network',
    };
    SdkManager.init(ApiSecurityFixture);

    const client = Network.Network.client(envEndpoint.value, appDetails, {
      bridgeUser: 'bridgeUser',
      userId: 'userId',
    });

    const spyConfigService = vi.spyOn(ConfigService.instance, 'get').mockReturnValue(envEndpoint.value);
    vi.spyOn(SdkManager, 'getApiSecurity').mockReturnValue(ApiSecurityFixture);
    vi.spyOn(SdkManager, 'getAppDetails').mockReturnValue(appDetails);
    vi.spyOn(Network.Network, 'client').mockReturnValue(client);

    const newClient = SdkManager.instance.getNetwork({
      user: 'bridgeUser',
      pass: '123',
    });

    expect(spyConfigService).toHaveBeenCalledWith(envEndpoint.key);
    expect(newClient).to.be.deep.equal(client);
  });
});
