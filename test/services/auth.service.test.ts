import { expect } from 'chai';
import sinon, { SinonSandbox } from 'sinon';
import crypto from 'crypto';
import { AuthService } from '../../src/services/auth.service';
import { KeysService } from '../../src/services/keys.service';
import { CryptoService } from '../../src/services/crypto.service';
import { SdkManager } from '../../src/services/SDKManager.service';
import { UserFixture } from '../fixtures/auth.fixture';
import { Auth, LoginDetails, SecurityDetails } from '@internxt/sdk';

describe('Auth service', () => {
  let authServiceSandbox: SinonSandbox;

  beforeEach(() => {
    authServiceSandbox = sinon.createSandbox();
  });

  afterEach(function () {
    authServiceSandbox.restore();
  });

  it('When user logs in, then login user credentials are generated', async () => {
    const loginResponse = {
      token: crypto.randomBytes(16).toString('hex'),
      newToken: crypto.randomBytes(16).toString('hex'),
      user: UserFixture,
      userTeam: null,
    };

    authServiceSandbox.stub(Auth.prototype, 'login').returns(Promise.resolve(loginResponse));
    authServiceSandbox.stub(SdkManager.instance, 'getAuth').returns(Auth.prototype);
    authServiceSandbox.stub(KeysService.instance, 'decryptPrivateKey').returns(loginResponse.user.privateKey);
    authServiceSandbox.stub(KeysService.instance, 'assertPrivateKeyIsValid').resolves();
    authServiceSandbox.stub(KeysService.instance, 'assertValidateKeys').resolves();
    authServiceSandbox.stub(CryptoService.instance, 'decryptTextWithKey').returns(loginResponse.user.mnemonic);

    const responseLogin = await AuthService.instance.doLogin(
      loginResponse.user.email,
      crypto.randomBytes(16).toString('hex'),
      '',
    );
    const expectedResponseLogin = {
      user: { ...loginResponse.user, privateKey: Buffer.from(loginResponse.user.privateKey).toString('base64') },
      token: loginResponse.token,
      newToken: loginResponse.newToken,
      mnemonic: loginResponse.user.mnemonic,
    };
    expect(responseLogin).to.eql(expectedResponseLogin);
  });

  it('When user logs in and credentials are not correct, then an error is thrown', async () => {
    const loginDetails: LoginDetails = {
      email: crypto.randomBytes(16).toString('hex'),
      password: crypto.randomBytes(8).toString('hex'),
      tfaCode: crypto.randomInt(1, 999999).toString().padStart(6, '0'),
    };

    authServiceSandbox.stub(Auth.prototype, 'login').withArgs(loginDetails, CryptoService.cryptoProvider).rejects();
    authServiceSandbox.stub(SdkManager.instance, 'getAuth').returns(Auth.prototype);

    try {
      await AuthService.instance.doLogin(loginDetails.email, loginDetails.password, loginDetails.tfaCode || '');
      expect(false).to.be.true; //should throw error
    } catch {
      /* no op */
    }
  });

  it('When two factor authentication property is enabled at securityDetails endpoint, then it is returned from is2FANeeded functionality', async () => {
    const email = crypto.randomBytes(16).toString('hex');
    const securityDetails: SecurityDetails = {
      encryptedSalt: crypto.randomBytes(16).toString('hex'),
      tfaEnabled: true,
    };

    authServiceSandbox
      .stub(Auth.prototype, 'securityDetails')
      .withArgs(email)
      .returns(Promise.resolve(securityDetails));
    authServiceSandbox.stub(SdkManager.instance, 'getAuth').returns(Auth.prototype);

    const responseLogin = await AuthService.instance.is2FANeeded(email);

    expect(responseLogin).to.equal(securityDetails.tfaEnabled);
  });

  it('When email is not correct when checking two factor authentication property, then an error is thrown', async () => {
    const email = crypto.randomBytes(16).toString('hex');

    authServiceSandbox.stub(Auth.prototype, 'securityDetails').withArgs(email).rejects();
    authServiceSandbox.stub(SdkManager.instance, 'getAuth').returns(Auth.prototype);

    try {
      await AuthService.instance.is2FANeeded(email);
      expect(false).to.be.true; //should throw error
    } catch {
      /* no op */
    }
  });
});
