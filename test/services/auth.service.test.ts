import { beforeEach, describe, expect, it, vi } from 'vitest';
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

  it('When user logs in and credentials are not correct, then an error is thrown', async () => {
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

  it('When two factor authentication is enabled, then it is returned from is2FANeeded functionality', async () => {
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

  it('When token has expired, should throw an error', async () => {
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

  it('When tokens are going to expire soon, then they are refreshed', async () => {
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

  it('should clear user data and throw OldTokenDetectedError when old token is detected during token refresh', async () => {
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

    try {
      await sut.getAuthDetails();
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).name).to.be.equal('OldTokenDetectedError');
      expect((error as Error).message).to.include('Old token detected');
    }

    expect(refreshTokenStub).toHaveBeenCalledOnce();
    expect(clearUserStub).toHaveBeenCalledOnce();
  });

  it('should rethrow error if token refresh fails for reasons other than old token detection', async () => {
    const sut = AuthService.instance;

    const mockToken = {
      isValid: true,
      expiration: {
        expired: false,
        refreshRequired: true,
      },
    };

    const networkError = new Error('Network timeout');

    vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(UserCredentialsFixture);
    vi.spyOn(ValidationService.instance, 'validateTokenAndCheckExpiration').mockImplementationOnce(() => mockToken);
    vi.spyOn(ValidationService.instance, 'validateMnemonic').mockReturnValue(true);
    const refreshTokenStub = vi.spyOn(sut, 'refreshUserToken').mockRejectedValue(networkError);
    const clearUserStub = vi.spyOn(ConfigService.instance, 'clearUser').mockResolvedValue();

    try {
      await sut.getAuthDetails();
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.be.equal('Network timeout');
    }

    expect(refreshTokenStub).toHaveBeenCalledOnce();
    expect(clearUserStub).not.toHaveBeenCalled();
  });
});
