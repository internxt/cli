import { expect } from 'chai';
import sinon, { SinonSandbox } from 'sinon';
import crypto from 'crypto';
import { Auth, LoginDetails, SecurityDetails } from '@internxt/sdk';
import { AuthService } from '../../src/services/auth.service';
import { KeysService } from '../../src/services/keys.service';
import { CryptoService } from '../../src/services/crypto.service';
import { SdkManager } from '../../src/services/sdk-manager.service';
import { ConfigService } from '../../src/services/config.service';
import { ValidationService } from '../../src/services/validation.service';
import { UserFixture } from '../fixtures/auth.fixture';
import {
  ExpiredCredentialsError,
  InvalidCredentialsError,
  LoginCredentials,
  MissingCredentialsError,
} from '../../src/types/command.types';
import { UserCredentialsFixture } from '../fixtures/login.fixture';
import { fail } from 'assert';

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
    const mockDate = new Date().toISOString();

    authServiceSandbox.stub(Auth.prototype, 'login').resolves(loginResponse);
    authServiceSandbox.stub(SdkManager.instance, 'getAuth').returns(Auth.prototype);
    authServiceSandbox.stub(KeysService.instance, 'decryptPrivateKey').returns(loginResponse.user.privateKey);
    authServiceSandbox.stub(KeysService.instance, 'assertPrivateKeyIsValid').resolves();
    authServiceSandbox.stub(KeysService.instance, 'assertValidateKeys').resolves();
    authServiceSandbox.stub(CryptoService.instance, 'decryptTextWithKey').returns(loginResponse.user.mnemonic);
    authServiceSandbox.stub(Date.prototype, 'toISOString').returns(mockDate);

    const responseLogin = await AuthService.instance.doLogin(
      loginResponse.user.email,
      crypto.randomBytes(16).toString('hex'),
      '',
    );

    const expectedResponseLogin: LoginCredentials = {
      user: { ...loginResponse.user, privateKey: Buffer.from(loginResponse.user.privateKey).toString('base64') },
      token: loginResponse.token,
      newToken: loginResponse.newToken,
      lastLoggedInAt: mockDate,
      lastTokenRefreshAt: mockDate,
    };
    expect(responseLogin).to.eql(expectedResponseLogin);
  });

  it('When user logs in and credentials are not correct, then an error is thrown', async () => {
    const loginDetails: LoginDetails = {
      email: crypto.randomBytes(16).toString('hex'),
      password: crypto.randomBytes(8).toString('hex'),
      tfaCode: crypto.randomInt(1, 999999).toString().padStart(6, '0'),
    };

    const loginStub = authServiceSandbox
      .stub(Auth.prototype, 'login')
      .withArgs(loginDetails, CryptoService.cryptoProvider)
      .rejects();
    authServiceSandbox.stub(SdkManager.instance, 'getAuth').returns(Auth.prototype);

    try {
      await AuthService.instance.doLogin(loginDetails.email, loginDetails.password, loginDetails.tfaCode || '');
      fail('Expected function to throw an error, but it did not.');
    } catch {
      /* no op */
    }
    expect(loginStub.calledOnce).to.be.true;
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

    const securityStub = authServiceSandbox.stub(Auth.prototype, 'securityDetails').withArgs(email).rejects();
    authServiceSandbox.stub(SdkManager.instance, 'getAuth').returns(Auth.prototype);

    try {
      await AuthService.instance.is2FANeeded(email);
      fail('Expected function to throw an error, but it did not.');
    } catch {
      /* no op */
    }
    expect(securityStub.calledOnce).to.be.true;
  });

  it('When getting auth details, should get them if all are found', async () => {
    const sut = AuthService.instance;

    const loginCreds: LoginCredentials = UserCredentialsFixture;
    const mockTokens = {
      isValid: true,
      expiration: {
        expired: false,
        refreshRequired: false,
      },
    };

    authServiceSandbox.stub(ConfigService.instance, 'readUser').resolves(loginCreds);

    const validateTokensStub = authServiceSandbox
      .stub(ValidationService.instance, 'validateTokenAndCheckExpiration')
      .onFirstCall()
      .returns(mockTokens)
      .onSecondCall()
      .returns(mockTokens);
    const validateMnemonicStub = authServiceSandbox.stub(ValidationService.instance, 'validateMnemonic').returns(true);

    const result = await sut.getAuthDetails();

    expect(validateTokensStub.calledTwice).to.be.true;
    expect(validateMnemonicStub).to.be.calledOnceWith(loginCreds.user.mnemonic);

    expect(result).to.deep.equal(loginCreds);
  });

  it('When credentials are missing, should throw an error', async () => {
    const sut = AuthService.instance;

    const readUserStub = authServiceSandbox.stub(ConfigService.instance, 'readUser').resolves(undefined);

    try {
      await sut.getAuthDetails();
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.equal(new MissingCredentialsError().message);
    }
    expect(readUserStub.calledOnce).to.be.true;
  });

  it('When auth token is missing, should throw an error', async () => {
    const sut = AuthService.instance;

    const readUserStub = authServiceSandbox.stub(ConfigService.instance, 'readUser').resolves({
      user: UserFixture,
      // @ts-expect-error - We are faking a missing auth token
      token: undefined,
      newToken: 'test_new_auth_token',
    });

    try {
      await sut.getAuthDetails();
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.equal(new MissingCredentialsError().message);
    }
    expect(readUserStub.calledOnce).to.be.true;
  });

  it('When new auth token is missing, should throw an error', async () => {
    const sut = AuthService.instance;

    const readUserStub = authServiceSandbox.stub(ConfigService.instance, 'readUser').resolves({
      user: UserFixture,
      token: 'test_auth_token',
      // @ts-expect-error - We are faking a missing auth token
      newToken: undefined,
    });

    try {
      await sut.getAuthDetails();
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.equal(new MissingCredentialsError().message);
    }
    expect(readUserStub.calledOnce).to.be.true;
  });

  it('When mnemonic is invalid, should throw an error', async () => {
    const sut = AuthService.instance;

    const mockTokens = {
      isValid: true,
      expiration: {
        expired: false,
        refreshRequired: false,
      },
    };

    const authStub = authServiceSandbox.stub(ConfigService.instance, 'readUser').resolves(UserCredentialsFixture);
    const validateTokensStub = authServiceSandbox
      .stub(ValidationService.instance, 'validateTokenAndCheckExpiration')
      .onFirstCall()
      .returns(mockTokens)
      .onSecondCall()
      .returns(mockTokens);
    const validateMnemonicStub = authServiceSandbox.stub(ValidationService.instance, 'validateMnemonic').returns(false);

    try {
      await sut.getAuthDetails();
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.equal(new InvalidCredentialsError().message);
    }
    expect(authStub.calledOnce).to.be.true;
    expect(validateTokensStub.calledTwice).to.be.true;
    expect(validateMnemonicStub).to.be.calledOnceWith(UserCredentialsFixture.user.mnemonic);
  });

  it('When token has expired, should throw an error', async () => {
    const sut = AuthService.instance;

    const mockTokens = {
      isValid: true,
      expiration: {
        expired: true,
        refreshRequired: false,
      },
    };

    const authStub = authServiceSandbox.stub(ConfigService.instance, 'readUser').resolves(UserCredentialsFixture);
    const validateTokensStub = authServiceSandbox
      .stub(ValidationService.instance, 'validateTokenAndCheckExpiration')
      .onFirstCall()
      .returns(mockTokens)
      .onSecondCall()
      .returns(mockTokens);
    const validateMnemonicStub = authServiceSandbox.stub(ValidationService.instance, 'validateMnemonic').returns(true);

    try {
      await sut.getAuthDetails();
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.equal(new ExpiredCredentialsError().message);
    }
    expect(authStub.calledOnce).to.be.true;
    expect(validateTokensStub.calledTwice).to.be.true;
    expect(validateMnemonicStub).to.be.calledOnceWith(UserCredentialsFixture.user.mnemonic);
  });

  it('When tokens are going to expire soon, then they are refreshed', async () => {
    const sut = AuthService.instance;

    const mockTokens = {
      isValid: true,
      expiration: {
        expired: false,
        refreshRequired: true,
      },
    };

    const authStub = authServiceSandbox.stub(ConfigService.instance, 'readUser').resolves(UserCredentialsFixture);
    const validateTokensStub = authServiceSandbox
      .stub(ValidationService.instance, 'validateTokenAndCheckExpiration')
      .onFirstCall()
      .returns(mockTokens)
      .onSecondCall()
      .returns(mockTokens);
    const validateMnemonicStub = authServiceSandbox.stub(ValidationService.instance, 'validateMnemonic').returns(true);
    const refreshTokensStub = authServiceSandbox.stub(sut, 'refreshUserTokens').resolves(UserCredentialsFixture);

    await sut.getAuthDetails();
    expect(authStub.calledOnce).to.be.true;
    expect(validateTokensStub.calledTwice).to.be.true;
    expect(validateMnemonicStub).to.be.calledOnceWith(UserCredentialsFixture.user.mnemonic);
    expect(refreshTokensStub.calledOnce).to.be.true;
  });
});
