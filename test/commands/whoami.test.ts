import { describe, expect, test, vi } from 'vitest';
import { TokenStatus } from '@internxt/lib';
import { ConfigService } from '../../src/services/config.service';
import { UserCredentialsFixture } from '../fixtures/login.fixture';
import Whoami from '../../src/commands/whoami';
import { ValidationService } from '../../src/services/validation.service';
import { AuthService } from '../../src/services/auth.service';
import { CLIUtils } from '../../src/utils/cli.utils';
import { newClientVersionUnsupportedError } from '../fixtures/errors.fixture';

describe('Whoami Command', () => {
  test('When user is logged out, then it returns false', async () => {
    const readUserSpy = vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(undefined);
    const clearUserSpy = vi.spyOn(ConfigService.instance, 'clearUser').mockRejectedValue(new Error());
    const validateTokensSpy = vi
      .spyOn(ValidationService.instance, 'validateTokenAndCheckExpiration')
      .mockRejectedValue(new Error());
    const validateMnemonicSpy = vi.spyOn(ValidationService.instance, 'validateMnemonic').mockRejectedValue(new Error());

    const message = 'You are not logged in.';
    const expected = { success: false, message };

    const result = await Whoami.run();

    expect(result).to.be.deep.equal(expected);
    expect(readUserSpy).toHaveBeenCalledOnce();
    expect(clearUserSpy).not.toHaveBeenCalled();
    expect(validateTokensSpy).not.toHaveBeenCalled();
    expect(validateMnemonicSpy).not.toHaveBeenCalled();
  });

  test('When user is logged in with expired credentials, then it returns the user credentials', async () => {
    const readUserSpy = vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(UserCredentialsFixture);
    const clearUserSpy = vi.spyOn(ConfigService.instance, 'clearUser').mockResolvedValue();
    const validateTokensSpy = vi
      .spyOn(ValidationService.instance, 'validateTokenAndCheckExpiration')
      .mockReturnValueOnce(TokenStatus.EXPIRED);
    const validateMnemonicSpy = vi.spyOn(ValidationService.instance, 'validateMnemonic').mockReturnValue(true);

    const message = 'Your session has expired. You have been logged out. Please log in again.';
    const expected = { success: false, message };

    const result = await Whoami.run();

    expect(result).to.be.deep.equal(expected);
    expect(readUserSpy).toHaveBeenCalledOnce();
    expect(clearUserSpy).toHaveBeenCalledOnce();
    expect(validateTokensSpy).toHaveBeenCalledOnce();
    expect(validateMnemonicSpy).toHaveBeenCalledOnce();
  });

  test('When user is logged in with valid credentials, then it returns the user credentials', async () => {
    const readUserSpy = vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(UserCredentialsFixture);
    const clearUserSpy = vi.spyOn(ConfigService.instance, 'clearUser').mockResolvedValue();
    const validateTokensSpy = vi
      .spyOn(ValidationService.instance, 'validateTokenAndCheckExpiration')
      .mockReturnValueOnce(TokenStatus.VALID);
    const validateMnemonicSpy = vi.spyOn(ValidationService.instance, 'validateMnemonic').mockReturnValue(true);

    const message = `You are logged in as: ${UserCredentialsFixture.user.email}.`;
    const expected = { success: true, message, login: UserCredentialsFixture };

    const result = await Whoami.run();

    expect(result).to.be.deep.equal(expected);
    expect(readUserSpy).toHaveBeenCalledOnce();
    expect(clearUserSpy).not.toHaveBeenCalled();
    expect(validateTokensSpy).toHaveBeenCalledOnce();
    expect(validateMnemonicSpy).toHaveBeenCalledOnce();
  });

  test('When the token refresh is blocked for the CLI version, then it fails with the update message', async () => {
    vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(UserCredentialsFixture);
    vi.spyOn(ValidationService.instance, 'validateTokenAndCheckExpiration').mockReturnValueOnce(
      TokenStatus.REFRESH_REQUIRED,
    );
    vi.spyOn(ValidationService.instance, 'validateMnemonic').mockReturnValue(true);
    const versionError = newClientVersionUnsupportedError();
    vi.spyOn(AuthService.instance, 'refreshUserToken').mockRejectedValue(versionError);
    const catchErrorSpy = vi.spyOn(CLIUtils, 'catchError').mockImplementation(() => {});

    await expect(Whoami.run()).rejects.toThrow('EEXIT: 1');

    expect(catchErrorSpy).toHaveBeenCalledWith(expect.objectContaining({ error: versionError }));
  });

  test('When the token refresh fails for another reason, then the user is still reported as logged in', async () => {
    vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(UserCredentialsFixture);
    vi.spyOn(ValidationService.instance, 'validateTokenAndCheckExpiration').mockReturnValueOnce(
      TokenStatus.REFRESH_REQUIRED,
    );
    vi.spyOn(ValidationService.instance, 'validateMnemonic').mockReturnValue(true);
    vi.spyOn(AuthService.instance, 'refreshUserToken').mockRejectedValue(new Error('socket hang up'));

    const result = await Whoami.run();

    expect(result).toMatchObject({ success: true });
  });
});
