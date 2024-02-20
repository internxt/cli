import chai, { expect } from 'chai';
import sinon, { SinonSandbox } from 'sinon';
import sinonChai from 'sinon-chai';
import crypto from 'crypto';
import { Auth, Drive, Network, photos } from '@internxt/sdk';
import { Trash } from '@internxt/sdk/dist/drive';
import { SdkManager, SdkManagerApiSecurity } from '../../src/services/sdk-manager.service';
import { ConfigKeys } from '../../src/types/config.types';
import { ConfigService } from '../../src/services/config.service';
import { AppDetails } from '@internxt/sdk/dist/shared';
import packageJson from '../../package.json';

chai.use(sinonChai);

describe('SDKManager service', () => {
  let sdkManagerServiceSandbox: SinonSandbox;

  const apiSecurity: SdkManagerApiSecurity = {
    newToken: crypto.randomBytes(16).toString('hex'),
    token: crypto.randomBytes(16).toString('hex'),
  };
  const appDetails: AppDetails = {
    clientName: crypto.randomBytes(16).toString('hex'),
    clientVersion: crypto.randomBytes(16).toString('hex'),
  };

  beforeEach(() => {
    sdkManagerServiceSandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sdkManagerServiceSandbox.restore();
  });

  it('When SDKManager apiSecurity is requested, then it is returned from static property', () => {
    const apiSecurity: SdkManagerApiSecurity = {
      newToken: crypto.randomBytes(16).toString('hex'),
      token: crypto.randomBytes(16).toString('hex'),
    };
    SdkManager.init(apiSecurity);

    expect(SdkManager.getApiSecurity()).to.eql(apiSecurity);
  });

  it('When SDKManager apiSecurity is requested but it is not started, then an error is thrown', () => {
    try {
      SdkManager.getApiSecurity();
      expect(false).to.be.true; //should throw error
    } catch {
      /* no op */
    }
  });

  it('When SDKManager is cleaned, then apiSecurity property is cleaned', () => {
    SdkManager.init(apiSecurity);
    SdkManager.clean();
    try {
      SdkManager.getApiSecurity({ throwErrorOnMissingCredentials: true });
      expect(false).to.be.true; //should throw error
    } catch {
      /* no op */
    }
    const apiSecurityResponse = SdkManager.getApiSecurity({ throwErrorOnMissingCredentials: false });
    expect(apiSecurityResponse).to.be.undefined;
  });

  it('When getAppDetails is requested, then it is generated using packageJson values', () => {
    const expectedAppdetails = {
      clientName: packageJson.name,
      clientVersion: packageJson.version,
    };
    /*sdkManagerServiceSandbox.stub(packageJson, 'name').returns(appDetails.clientName);
    sdkManagerServiceSandbox.stub(packageJson, 'version').returns(appDetails.clientVersion);*/

    const appDetailsResponse = SdkManager.getAppDetails();
    expect(expectedAppdetails).to.eql(appDetailsResponse);
  });

  it('When AuthV2 client is requested, then it is generated using internxt sdk', () => {
    const envEndpoint: { key: keyof ConfigKeys; value: string } = {
      key: 'DRIVE_NEW_API_URL',
      value: 'test/api',
    };
    SdkManager.init(apiSecurity);

    const authClientV2 = Auth.client(envEndpoint.value, appDetails, apiSecurity);

    const spyConfigService = sdkManagerServiceSandbox
      .stub(ConfigService.instance, 'get')
      .withArgs(envEndpoint.key)
      .returns(envEndpoint.value);
    sdkManagerServiceSandbox.stub(SdkManager, 'getApiSecurity').returns(apiSecurity);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sdkManagerServiceSandbox.stub(SdkManager, <any>'getAppDetails').returns(appDetails);
    sdkManagerServiceSandbox.stub(Auth, 'client').returns(authClientV2);

    const authV2 = SdkManager.instance.getAuthV2();

    expect(spyConfigService).to.be.calledWith(envEndpoint.key);
    expect(authV2).to.eql(authClientV2);
  });

  it('When Auth client is requested, then it is generated using internxt sdk', () => {
    const envEndpoint: { key: keyof ConfigKeys; value: string } = {
      key: 'DRIVE_API_URL',
      value: 'test/api',
    };
    SdkManager.init(apiSecurity);

    const authClient = Auth.client(envEndpoint.value, appDetails, apiSecurity);

    const spyConfigService = sdkManagerServiceSandbox
      .stub(ConfigService.instance, 'get')
      .withArgs(envEndpoint.key)
      .returns(envEndpoint.value);
    sdkManagerServiceSandbox.stub(SdkManager, 'getApiSecurity').returns(apiSecurity);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sdkManagerServiceSandbox.stub(SdkManager, <any>'getAppDetails').returns(appDetails);
    sdkManagerServiceSandbox.stub(Auth, 'client').returns(authClient);

    const auth = SdkManager.instance.getAuth();

    expect(spyConfigService).to.be.calledWith(envEndpoint.key);
    expect(auth).to.eql(authClient);
  });

  it('When Payments client is requested, then it is generated using internxt sdk', () => {
    const envEndpoint: { key: keyof ConfigKeys; value: string } = {
      key: 'PAYMENTS_API_URL',
      value: 'test/api',
    };
    SdkManager.init(apiSecurity);

    const client = Drive.Payments.client(envEndpoint.value, appDetails, apiSecurity);

    const spyConfigService = sdkManagerServiceSandbox
      .stub(ConfigService.instance, 'get')
      .withArgs(envEndpoint.key)
      .returns(envEndpoint.value);
    sdkManagerServiceSandbox.stub(SdkManager, 'getApiSecurity').returns(apiSecurity);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sdkManagerServiceSandbox.stub(SdkManager, <any>'getAppDetails').returns(appDetails);
    sdkManagerServiceSandbox.stub(Drive.Payments, 'client').returns(client);

    const newClient = SdkManager.instance.getPayments();

    expect(spyConfigService).to.be.calledWith(envEndpoint.key);
    expect(newClient).to.eql(client);
  });

  it('When Users client is requested, then it is generated using internxt sdk', () => {
    const envEndpoint: { key: keyof ConfigKeys; value: string } = {
      key: 'DRIVE_API_URL',
      value: 'test/api',
    };
    SdkManager.init(apiSecurity);

    const client = Drive.Users.client(envEndpoint.value, appDetails, apiSecurity);

    const spyConfigService = sdkManagerServiceSandbox
      .stub(ConfigService.instance, 'get')
      .withArgs(envEndpoint.key)
      .returns(envEndpoint.value);
    sdkManagerServiceSandbox.stub(SdkManager, 'getApiSecurity').returns(apiSecurity);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sdkManagerServiceSandbox.stub(SdkManager, <any>'getAppDetails').returns(appDetails);
    sdkManagerServiceSandbox.stub(Drive.Users, 'client').returns(client);

    const newClient = SdkManager.instance.getUsers();

    expect(spyConfigService).to.be.calledWith(envEndpoint.key);
    expect(newClient).to.eql(client);
  });

  it('When Referrals client is requested, then it is generated using internxt sdk', () => {
    const envEndpoint: { key: keyof ConfigKeys; value: string } = {
      key: 'DRIVE_API_URL',
      value: 'test/api',
    };
    SdkManager.init(apiSecurity);

    const client = Drive.Referrals.client(envEndpoint.value, appDetails, apiSecurity);

    const spyConfigService = sdkManagerServiceSandbox
      .stub(ConfigService.instance, 'get')
      .withArgs(envEndpoint.key)
      .returns(envEndpoint.value);
    sdkManagerServiceSandbox.stub(SdkManager, 'getApiSecurity').returns(apiSecurity);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sdkManagerServiceSandbox.stub(SdkManager, <any>'getAppDetails').returns(appDetails);
    sdkManagerServiceSandbox.stub(Drive.Referrals, 'client').returns(client);

    const newClient = SdkManager.instance.getReferrals();

    expect(spyConfigService).to.be.calledWith(envEndpoint.key);
    expect(newClient).to.eql(client);
  });

  it('When Storage client is requested, then it is generated using internxt sdk', () => {
    const envEndpoint: { key: keyof ConfigKeys; value: string } = {
      key: 'DRIVE_API_URL',
      value: 'test/api',
    };
    SdkManager.init(apiSecurity);

    const client = Drive.Storage.client(envEndpoint.value, appDetails, apiSecurity);

    const spyConfigService = sdkManagerServiceSandbox
      .stub(ConfigService.instance, 'get')
      .withArgs(envEndpoint.key)
      .returns(envEndpoint.value);
    sdkManagerServiceSandbox.stub(SdkManager, 'getApiSecurity').returns(apiSecurity);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sdkManagerServiceSandbox.stub(SdkManager, <any>'getAppDetails').returns(appDetails);
    sdkManagerServiceSandbox.stub(Drive.Storage, 'client').returns(client);

    const newClient = SdkManager.instance.getStorage();

    expect(spyConfigService).to.be.calledWith(envEndpoint.key);
    expect(newClient).to.eql(client);
  });

  it('When Trash client is requested, then it is generated using internxt sdk', () => {
    const envEndpoint: { key: keyof ConfigKeys; value: string } = {
      key: 'DRIVE_NEW_API_URL',
      value: 'test/api',
    };
    SdkManager.init(apiSecurity);

    const client = Trash.client(envEndpoint.value, appDetails, apiSecurity);

    const spyConfigService = sdkManagerServiceSandbox
      .stub(ConfigService.instance, 'get')
      .withArgs(envEndpoint.key)
      .returns(envEndpoint.value);
    sdkManagerServiceSandbox.stub(SdkManager, 'getApiSecurity').returns(apiSecurity);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sdkManagerServiceSandbox.stub(SdkManager, <any>'getAppDetails').returns(appDetails);
    sdkManagerServiceSandbox.stub(Trash, 'client').returns(client);

    const newClient = SdkManager.instance.getTrash();

    expect(spyConfigService).to.be.calledWith(envEndpoint.key);
    expect(newClient).to.eql(client);
  });

  it('When Photos client is requested, then it is generated using internxt sdk', () => {
    const envEndpoint: { key: keyof ConfigKeys; value: string } = {
      key: 'PHOTOS_API_URL',
      value: 'test/api',
    };
    SdkManager.init(apiSecurity);

    const client = new photos.Photos(envEndpoint.value, apiSecurity.newToken);

    const spyConfigService = sdkManagerServiceSandbox
      .stub(ConfigService.instance, 'get')
      .withArgs(envEndpoint.key)
      .returns(envEndpoint.value);
    sdkManagerServiceSandbox.stub(SdkManager, 'getApiSecurity').returns(apiSecurity);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sdkManagerServiceSandbox.stub(SdkManager, <any>'getAppDetails').returns(appDetails);

    sdkManagerServiceSandbox.stub(photos.Photos, 'prototype').returns(client);

    const newClient = SdkManager.instance.getPhotos();

    expect(spyConfigService).to.be.calledWith(envEndpoint.key);
    expect(newClient).to.eql(client);
  });

  it('When Share client is requested, then it is generated using internxt sdk', () => {
    const envEndpoint: { key: keyof ConfigKeys; value: string } = {
      key: 'DRIVE_NEW_API_URL',
      value: 'test/api',
    };
    SdkManager.init(apiSecurity);

    const client = Drive.Share.client(envEndpoint.value, appDetails, apiSecurity);

    const spyConfigService = sdkManagerServiceSandbox
      .stub(ConfigService.instance, 'get')
      .withArgs(envEndpoint.key)
      .returns(envEndpoint.value);
    sdkManagerServiceSandbox.stub(SdkManager, 'getApiSecurity').returns(apiSecurity);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sdkManagerServiceSandbox.stub(SdkManager, <any>'getAppDetails').returns(appDetails);
    sdkManagerServiceSandbox.stub(Drive.Share, 'client').returns(client);

    const newClient = SdkManager.instance.getShare();

    expect(spyConfigService).to.be.calledWith(envEndpoint.key);
    expect(newClient).to.eql(client);
  });

  it('When Network client is requested, then it is generated using internxt sdk', () => {
    const envEndpoint: { key: keyof ConfigKeys; value: string } = {
      key: 'NETWORK_URL',
      value: 'test/network',
    };
    SdkManager.init(apiSecurity);

    const client = Network.Network.client(envEndpoint.value, appDetails, {
      bridgeUser: 'bridgeUser',
      userId: 'userId',
    });

    const spyConfigService = sdkManagerServiceSandbox
      .stub(ConfigService.instance, 'get')
      .withArgs(envEndpoint.key)
      .returns(envEndpoint.value);
    sdkManagerServiceSandbox.stub(SdkManager, 'getApiSecurity').returns(apiSecurity);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sdkManagerServiceSandbox.stub(SdkManager, <any>'getAppDetails').returns(appDetails);
    sdkManagerServiceSandbox.stub(Network.Network, 'client').returns(client);

    const newClient = SdkManager.instance.getNetwork({
      user: 'bridgeUser',
      pass: '123',
    });

    expect(spyConfigService).to.be.calledWith(envEndpoint.key);
    expect(newClient).to.eql(client);
  });
});
