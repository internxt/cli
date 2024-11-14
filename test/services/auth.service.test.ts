import { expect } from 'chai';
import sinon, { SinonSandbox } from 'sinon';
import crypto from 'crypto';
import { Auth, LoginDetails, SecurityDetails } from '@internxt/sdk';
import { Users } from '@internxt/sdk/dist/drive';
import { AuthService } from '../../src/services/auth.service';
import { KeysService } from '../../src/services/keys.service';
import { CryptoService } from '../../src/services/crypto.service';
import { SdkManager } from '../../src/services/sdk-manager.service';
import { ConfigService } from '../../src/services/config.service';
import { ValidationService } from '../../src/services/validation.service';
import { UserFixture } from '../fixtures/auth.fixture';

describe('Auth service', () => {
  let authServiceSandbox: SinonSandbox;

  beforeEach(() => {
    authServiceSandbox = sinon.createSandbox();
  });

  afterEach(() => {
    authServiceSandbox.restore();
  });

  it('When user logs in, then login user credentials are generated', async () => {
    const loginResponse = {
      token: crypto.randomBytes(16).toString('hex'),
      newToken: crypto.randomBytes(16).toString('hex'),
      user: UserFixture,
      userTeam: null,
    };

    authServiceSandbox.stub(Auth.prototype, 'login').resolves(loginResponse);
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

    authServiceSandbox.stub(Auth.prototype, 'securityDetails').withArgs(email).resolves(securityDetails);
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

  it('When getting auth details, should get them if all are found', async () => {
    const sut = AuthService.instance;

    authServiceSandbox.stub(ConfigService.instance, 'readUser').resolves({
      user: UserFixture,
      token: 'test_auth_token',
      newToken: 'test_new_auth_token',
      mnemonic: 'test_mnemonic',
    });

    const validateMnemonicStub = authServiceSandbox.stub(ValidationService.instance, 'validateMnemonic').returns(true);

    const result = await sut.getAuthDetails();

    expect(validateMnemonicStub).to.be.calledOnceWith('test_mnemonic');

    expect(result).to.deep.equal({
      token: 'test_auth_token',
      newToken: 'test_new_auth_token',
      mnemonic: 'test_mnemonic',
      user: UserFixture,
    });
  });

  it('When credentials are missing, should throw an error', async () => {
    const sut = AuthService.instance;

    authServiceSandbox.stub(ConfigService.instance, 'readUser').resolves(undefined);

    try {
      await sut.getAuthDetails();
    } catch (error) {
      expect((error as Error).message).to.contain('Credentials not found, please login first');
    }
  });

  it('When auth token is missing, should throw an error', async () => {
    const sut = AuthService.instance;

    authServiceSandbox.stub(ConfigService.instance, 'readUser').resolves({
      user: UserFixture,
      // @ts-expect-error - We are faking a missing auth token
      token: undefined,
      newToken: 'test_new_auth_token',
      mnemonic: 'test_mnemonic',
    });

    try {
      await sut.getAuthDetails();
    } catch (error) {
      expect((error as Error).message).to.contain('Auth token not found');
    }
  });

  it('When new auth token is missing, should throw an error', async () => {
    const sut = AuthService.instance;

    authServiceSandbox.stub(ConfigService.instance, 'readUser').resolves({
      user: UserFixture,
      token: 'test_auth_token',
      // @ts-expect-error - We are faking a missing auth token
      newToken: undefined,
      mnemonic: 'test_mnemonic',
    });

    try {
      await sut.getAuthDetails();
    } catch (error) {
      expect((error as Error).message).to.contain('New Auth token not found');
    }
  });

  it('When mnemonic is missing, should throw an error', async () => {
    const sut = AuthService.instance;

    authServiceSandbox.stub(ConfigService.instance, 'readUser').resolves({
      user: UserFixture,
      token: 'test_auth_token',
      newToken: 'test_new_auth_token',
      // @ts-expect-error - We are faking a missing mnemonic
      mnemonic: undefined,
    });

    try {
      await sut.getAuthDetails();
    } catch (error) {
      expect((error as Error).message).to.contain('Mnemonic not found');
    }
  });

  it('When mnemonic is invalid, should throw an error', async () => {
    const sut = AuthService.instance;

    authServiceSandbox.stub(ConfigService.instance, 'readUser').resolves({
      user: UserFixture,
      token: 'test_auth_token',
      newToken: 'test_new_auth_token',
      mnemonic: 'test_mnemonic',
    });

    try {
      await sut.getAuthDetails();
    } catch (error) {
      expect((error as Error).message).to.contain('Mnemonic is not valid');
    }
  });

  it('When getting user, should return the user', async () => {
    const sut = AuthService.instance;
    authServiceSandbox.stub(Users.prototype, 'refreshUser').resolves({ user: UserFixture, token: 'test_token' });
    authServiceSandbox.stub(SdkManager.instance, 'getUsers').returns(Users.prototype);

    const result = await sut.getUser();

    expect(result).to.deep.equal(UserFixture);
  });
});
