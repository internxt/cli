import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';
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
import { fail } from 'node:assert';

describe('Auth service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When user logs in, then login user credentials are generated', async () => {
    const loginResponse = {
      token: crypto.randomBytes(16).toString('hex'),
      newToken: crypto.randomBytes(16).toString('hex'),
      user: UserFixture,
      userTeam: null,
    };
    const mockDate = new Date().toISOString();

    vi.spyOn(Auth.prototype, 'login').mockResolvedValue(loginResponse);
    vi.spyOn(SdkManager.instance, 'getAuth').mockReturnValue(Auth.prototype);
    vi.spyOn(KeysService.instance, 'decryptPrivateKey').mockReturnValue(loginResponse.user.privateKey);
    vi.spyOn(KeysService.instance, 'assertPrivateKeyIsValid').mockResolvedValue();
    vi.spyOn(KeysService.instance, 'assertValidateKeys').mockResolvedValue();
    vi.spyOn(CryptoService.instance, 'decryptTextWithKey').mockReturnValue(loginResponse.user.mnemonic);
    vi.spyOn(Date.prototype, 'toISOString').mockReturnValue(mockDate);

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
    expect(responseLogin).to.be.deep.equal(expectedResponseLogin);
  });

  it('When user logs in and credentials are not correct, then an error is thrown', async () => {
    const loginDetails: LoginDetails = {
      email: crypto.randomBytes(16).toString('hex'),
      password: crypto.randomBytes(8).toString('hex'),
      tfaCode: crypto.randomInt(1, 999999).toString().padStart(6, '0'),
    };

    const loginStub = vi.spyOn(Auth.prototype, 'login').mockRejectedValue(new Error('Login failed'));
    vi.spyOn(SdkManager.instance, 'getAuth').mockReturnValue(Auth.prototype);

    try {
      await AuthService.instance.doLogin(loginDetails.email, loginDetails.password, loginDetails.tfaCode || '');
      fail('Expected function to throw an error, but it did not.');
    } catch {
      /* no op */
    }
    expect(loginStub).toHaveBeenCalledOnce();
  });

  it('When two factor authentication is enabled, then it is returned from is2FANeeded functionality', async () => {
    const email = crypto.randomBytes(16).toString('hex');
    const securityDetails: SecurityDetails = {
      encryptedSalt: crypto.randomBytes(16).toString('hex'),
      tfaEnabled: true,
    };

    vi.spyOn(Auth.prototype, 'securityDetails').mockResolvedValue(securityDetails);
    vi.spyOn(SdkManager.instance, 'getAuth').mockReturnValue(Auth.prototype);

    const responseLogin = await AuthService.instance.is2FANeeded(email);

    expect(responseLogin).to.be.equal(securityDetails.tfaEnabled);
  });

  it('When email is not correct when checking two factor authentication, then an error is thrown', async () => {
    const email = crypto.randomBytes(16).toString('hex');

    const securityStub = vi.spyOn(Auth.prototype, 'securityDetails').mockRejectedValue(new Error());
    vi.spyOn(SdkManager.instance, 'getAuth').mockReturnValue(Auth.prototype);

    try {
      await AuthService.instance.is2FANeeded(email);
      fail('Expected function to throw an error, but it did not.');
    } catch {
      /* no op */
    }
    expect(securityStub).toHaveBeenCalledOnce();
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

    vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(loginCreds);

    const validateTokensStub = vi
      .spyOn(ValidationService.instance, 'validateTokenAndCheckExpiration')
      .mockImplementationOnce(() => mockTokens)
      .mockImplementationOnce(() => mockTokens);
    const validateMnemonicStub = vi.spyOn(ValidationService.instance, 'validateMnemonic').mockReturnValue(true);

    const result = await sut.getAuthDetails();

    expect(validateTokensStub).toHaveBeenCalledTimes(2);
    expect(validateMnemonicStub).toHaveBeenCalledWith(loginCreds.user.mnemonic);

    expect(result).to.deep.equal(loginCreds);
  });

  it('When credentials are missing, should throw an error', async () => {
    const sut = AuthService.instance;

    const readUserStub = vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(undefined);

    try {
      await sut.getAuthDetails();
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.be.equal(new MissingCredentialsError().message);
    }
    expect(readUserStub).toHaveBeenCalledOnce();
  });

  it('When auth token is missing, should throw an error', async () => {
    const sut = AuthService.instance;

    const readUserStub = vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue({
      user: UserFixture,
      // @ts-expect-error - We are faking a missing auth token
      token: undefined,
      newToken: 'test_new_auth_token',
    });

    try {
      await sut.getAuthDetails();
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.be.equal(new MissingCredentialsError().message);
    }
    expect(readUserStub).toHaveBeenCalledOnce();
  });

  it('When new auth token is missing, should throw an error', async () => {
    const sut = AuthService.instance;

    const readUserStub = vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue({
      user: UserFixture,
      token: 'test_auth_token',
      // @ts-expect-error - We are faking a missing auth token
      newToken: undefined,
    });

    try {
      await sut.getAuthDetails();
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.be.equal(new MissingCredentialsError().message);
    }
    expect(readUserStub).toHaveBeenCalledOnce();
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

    const authStub = vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(UserCredentialsFixture);
    const validateTokensStub = vi
      .spyOn(ValidationService.instance, 'validateTokenAndCheckExpiration')
      .mockImplementationOnce(() => mockTokens)
      .mockImplementationOnce(() => mockTokens);
    const validateMnemonicStub = vi.spyOn(ValidationService.instance, 'validateMnemonic').mockReturnValue(false);

    try {
      await sut.getAuthDetails();
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.be.equal(new InvalidCredentialsError().message);
    }
    expect(authStub).toHaveBeenCalledOnce();
    expect(validateTokensStub).toHaveBeenCalledTimes(2);
    expect(validateMnemonicStub).toHaveBeenCalledWith(UserCredentialsFixture.user.mnemonic);
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

    const authStub = vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(UserCredentialsFixture);
    const validateTokensStub = vi
      .spyOn(ValidationService.instance, 'validateTokenAndCheckExpiration')
      .mockImplementationOnce(() => mockTokens)
      .mockImplementationOnce(() => mockTokens);
    const validateMnemonicStub = vi.spyOn(ValidationService.instance, 'validateMnemonic').mockReturnValue(true);

    try {
      await sut.getAuthDetails();
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.be.equal(new ExpiredCredentialsError().message);
    }
    expect(authStub).toHaveBeenCalledOnce();
    expect(validateTokensStub).toHaveBeenCalledTimes(2);
    expect(validateMnemonicStub).toHaveBeenCalledWith(UserCredentialsFixture.user.mnemonic);
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

    const authStub = vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(UserCredentialsFixture);
    const validateTokensStub = vi
      .spyOn(ValidationService.instance, 'validateTokenAndCheckExpiration')
      .mockImplementationOnce(() => mockTokens)
      .mockImplementationOnce(() => mockTokens);
    const validateMnemonicStub = vi.spyOn(ValidationService.instance, 'validateMnemonic').mockReturnValue(true);
    const refreshTokensStub = vi.spyOn(sut, 'refreshUserTokens').mockResolvedValue(UserCredentialsFixture);

    await sut.getAuthDetails();
    expect(authStub).toHaveBeenCalledOnce();
    expect(validateTokensStub).toHaveBeenCalledTimes(2);
    expect(validateMnemonicStub).toHaveBeenCalledWith(UserCredentialsFixture.user.mnemonic);
    expect(refreshTokensStub).toHaveBeenCalledOnce();
  });
});
