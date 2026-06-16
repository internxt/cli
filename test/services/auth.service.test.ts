import { beforeEach, describe, expect, test, vi } from 'vitest';
import crypto from 'node:crypto';
import { Auth, LoginDetails, SecurityDetails } from '@internxt/sdk';
import { AuthService } from '../../src/services/auth.service';
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
import { paths } from '@internxt/sdk/dist/schema';
import { CacheService } from '../../src/services/cache.service';

describe('Auth service', () => {
  beforeEach(() => {
    vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(UserCredentialsFixture);
    vi.spyOn(ConfigService.instance, 'saveUser').mockResolvedValue(undefined);
    vi.spyOn(CacheService.instance, 'get').mockReturnValue(undefined);
  });

  test('when the user logs in successfully, then login credentials are generated', async () => {
    const loginResponse = {
      token: crypto.randomBytes(16).toString('hex'),
      newToken: crypto.randomBytes(16).toString('hex'),
      user: UserFixture,
      userTeam: null,
    } as unknown as paths['/auth/cli/login/access']['post']['responses']['200']['content']['application/json'];

    vi.spyOn(Auth.prototype, 'loginAccess').mockResolvedValue(loginResponse);
    vi.spyOn(SdkManager.instance, 'getAuth').mockReturnValue(Auth.prototype);
    vi.spyOn(CryptoService.instance, 'decryptTextWithKey').mockReturnValue(loginResponse.user.mnemonic);

    const responseLogin = await AuthService.instance.doLogin(
      loginResponse.user.email,
      crypto.randomBytes(16).toString('hex'),
      '',
    );

    const expectedResponseLogin: LoginCredentials = {
      user: { ...loginResponse.user },
      token: loginResponse.newToken,
    };
    expect(responseLogin).to.be.deep.equal(expectedResponseLogin);
  });

  test('when the user provides incorrect login credentials, then an error is thrown', async () => {
    const loginDetails: LoginDetails = {
      email: crypto.randomBytes(16).toString('hex'),
      password: crypto.randomBytes(8).toString('hex'),
      tfaCode: crypto.randomInt(1, 999999).toString().padStart(6, '0'),
    };

    const loginStub = vi.spyOn(Auth.prototype, 'loginAccess').mockRejectedValue(new Error('Login failed'));
    vi.spyOn(SdkManager.instance, 'getAuth').mockReturnValue(Auth.prototype);

    try {
      await AuthService.instance.doLogin(loginDetails.email, loginDetails.password, loginDetails.tfaCode || '');
      fail('Expected function to throw an error, but it did not.');
    } catch {
      /* no op */
    }
    expect(loginStub).toHaveBeenCalledOnce();
  });

  test('when two-factor authentication is enabled on the account, then the system reports it as required', async () => {
    const email = crypto.randomBytes(16).toString('hex');
    const securityDetails: SecurityDetails = {
      encryptedSalt: crypto.randomBytes(16).toString('hex'),
      tfaEnabled: true,
      useOpaqueLogin: false,
    };

    vi.spyOn(Auth.prototype, 'securityDetails').mockResolvedValue(securityDetails);
    vi.spyOn(SdkManager.instance, 'getAuth').mockReturnValue(Auth.prototype);

    const responseLogin = await AuthService.instance.is2FANeeded(email);

    expect(responseLogin).to.be.equal(securityDetails.tfaEnabled);
  });

  test('when an invalid email is provided for authentication validation, then an error is thrown', async () => {
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

  test('when all stored credentials are complete and valid, then authentication details are returned', async () => {
    const sut = AuthService.instance;

    const loginCreds: LoginCredentials = UserCredentialsFixture;
    const mockToken = {
      isValid: true,
      expiration: {
        expired: false,
        refreshRequired: false,
      },
    };

    vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(loginCreds);

    const validateTokensStub = vi
      .spyOn(ValidationService.instance, 'validateTokenAndCheckExpiration')
      .mockImplementationOnce(() => mockToken);
    const validateMnemonicStub = vi.spyOn(ValidationService.instance, 'validateMnemonic').mockReturnValue(true);

    const result = await sut.getAuthDetails();

    expect(validateTokensStub).toHaveBeenCalledOnce();
    expect(validateMnemonicStub).toHaveBeenCalledWith(loginCreds.user.mnemonic);

    expect(result).to.deep.equal(loginCreds);
  });

  test('when no stored credentials exist, then an error is thrown', async () => {
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

  test('when the session token is missing from stored credentials, then an error is thrown', async () => {
    const sut = AuthService.instance;

    const readUserStub = vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue({
      user: UserFixture,
      // @ts-expect-error - We are faking a missing auth token
      token: undefined,
    });

    try {
      await sut.getAuthDetails();
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.be.equal(new MissingCredentialsError().message);
    }
    expect(readUserStub).toHaveBeenCalledOnce();
  });

  test('when the recovery phrase is invalid, then an error is thrown', async () => {
    const sut = AuthService.instance;

    const mockToken = {
      isValid: true,
      expiration: {
        expired: false,
        refreshRequired: false,
      },
    };

    const authStub = vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(UserCredentialsFixture);
    const validateTokensStub = vi
      .spyOn(ValidationService.instance, 'validateTokenAndCheckExpiration')
      .mockImplementationOnce(() => mockToken);
    const validateMnemonicStub = vi.spyOn(ValidationService.instance, 'validateMnemonic').mockReturnValue(false);

    try {
      await sut.getAuthDetails();
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.be.equal(new InvalidCredentialsError().message);
    }
    expect(authStub).toHaveBeenCalledOnce();
    expect(validateTokensStub).toHaveBeenCalledOnce();
    expect(validateMnemonicStub).toHaveBeenCalledWith(UserCredentialsFixture.user.mnemonic);
  });

  test('when the session token has expired, then an error is thrown', async () => {
    const sut = AuthService.instance;

    const mockToken = {
      isValid: true,
      expiration: {
        expired: true,
        refreshRequired: false,
      },
    };

    const authStub = vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(UserCredentialsFixture);
    const validateTokensStub = vi
      .spyOn(ValidationService.instance, 'validateTokenAndCheckExpiration')
      .mockImplementationOnce(() => mockToken);
    const validateMnemonicStub = vi.spyOn(ValidationService.instance, 'validateMnemonic').mockReturnValue(true);

    try {
      await sut.getAuthDetails();
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.be.equal(new ExpiredCredentialsError().message);
    }
    expect(authStub).toHaveBeenCalledOnce();
    expect(validateTokensStub).toHaveBeenCalledOnce();
    expect(validateMnemonicStub).toHaveBeenCalledWith(UserCredentialsFixture.user.mnemonic);
  });

  test('when the session token is about to expire, then it is refreshed automatically', async () => {
    const sut = AuthService.instance;

    const mockToken = {
      isValid: true,
      expiration: {
        expired: false,
        refreshRequired: true,
      },
    };

    const authStub = vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(UserCredentialsFixture);
    const validateTokensStub = vi
      .spyOn(ValidationService.instance, 'validateTokenAndCheckExpiration')
      .mockImplementationOnce(() => mockToken);
    const validateMnemonicStub = vi.spyOn(ValidationService.instance, 'validateMnemonic').mockReturnValue(true);
    const refreshTokensStub = vi.spyOn(sut, 'refreshUserToken').mockResolvedValue(UserCredentialsFixture);

    await sut.getAuthDetails();
    expect(authStub).toHaveBeenCalledOnce();
    expect(validateTokensStub).toHaveBeenCalledOnce();
    expect(validateMnemonicStub).toHaveBeenCalledWith(UserCredentialsFixture.user.mnemonic);
    expect(refreshTokensStub).toHaveBeenCalledOnce();
  });

  test('when the token refresh fails, then stored credentials are cleared and an error is thrown', async () => {
    const sut = AuthService.instance;

    const mockToken = {
      isValid: true,
      expiration: {
        expired: false,
        refreshRequired: true,
      },
    };

    const oldTokenError = new Error('Old token version detected');

    vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(UserCredentialsFixture);
    vi.spyOn(ValidationService.instance, 'validateTokenAndCheckExpiration').mockImplementationOnce(() => mockToken);
    vi.spyOn(ValidationService.instance, 'validateMnemonic').mockReturnValue(true);
    const refreshTokenStub = vi.spyOn(sut, 'refreshUserToken').mockRejectedValue(oldTokenError);
    const clearUserStub = vi.spyOn(ConfigService.instance, 'clearUser').mockResolvedValue();

    await expect(() => sut.getAuthDetails()).rejects.toThrow(oldTokenError);
    expect(refreshTokenStub).toHaveBeenCalledOnce();
    expect(clearUserStub).toHaveBeenCalledOnce();
  });
});
