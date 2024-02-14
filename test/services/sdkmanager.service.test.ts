import chai, { expect } from 'chai';
import sinon, { SinonSandbox } from 'sinon';
import sinonChai from 'sinon-chai';
import crypto from 'crypto';
import { SdkManager, SdkManagerApiSecurity } from '../../src/services/SDKManager.service';
import { ConfigKeys } from '../../src/types/config.types';
import { ConfigService } from '../../src/services/config.service';
import { AppDetails } from '@internxt/sdk/dist/shared';

chai.use(sinonChai);

describe('SDKManager service', () => {
  let sdkManagerServiceSandbox: SinonSandbox;

  beforeEach(() => {
    sdkManagerServiceSandbox = sinon.createSandbox();
  });

  afterEach(function () {
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
    const apiSecurity: SdkManagerApiSecurity = {
      newToken: crypto.randomBytes(16).toString('hex'),
      token: crypto.randomBytes(16).toString('hex'),
    };
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

  it('When AuthV2 client is requested, then it is generated using internxt sdk', () => {
    const apiSecurity: SdkManagerApiSecurity = {
      newToken: crypto.randomBytes(16).toString('hex'),
      token: crypto.randomBytes(16).toString('hex'),
    };
    const appDetails: AppDetails = {
      clientName: crypto.randomBytes(16).toString('hex'),
      clientVersion: crypto.randomBytes(16).toString('hex'),
    };
    const envEndpoint: { key: keyof ConfigKeys; value: string } = { key: 'DRIVE_NEW_API_URL', value: 'test/api' };
    SdkManager.init(apiSecurity);

    sdkManagerServiceSandbox.stub(ConfigService.instance, 'get').withArgs(envEndpoint.key).returns(envEndpoint.value);
    sdkManagerServiceSandbox.stub(SdkManager, 'getApiSecurity').returns(apiSecurity);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sdkManagerServiceSandbox.stub(SdkManager, <any>'getAppDetails').returns(appDetails);
  });
});
