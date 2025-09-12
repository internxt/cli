import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../../src/services/config.service';
import { UserCredentialsFixture } from '../fixtures/login.fixture';
import Whoami from '../../src/commands/whoami';
import { ValidationService } from '../../src/services/validation.service';

describe('Whoami Command', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When user is logged out, then it returns false', async () => {
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

  it('When user is logged in with expired credentials, then it returns the user credentials', async () => {
    const readUserSpy = vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(UserCredentialsFixture);
    const clearUserSpy = vi.spyOn(ConfigService.instance, 'clearUser').mockResolvedValue();
    const validateTokensSpy = vi
      .spyOn(ValidationService.instance, 'validateTokenAndCheckExpiration')
      .mockReturnValueOnce({ expiration: { expired: true, refreshRequired: false }, isValid: true });
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

  it('When user is logged in with valid credentials, then it returns the user credentials', async () => {
    const readUserSpy = vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(UserCredentialsFixture);
    const clearUserSpy = vi.spyOn(ConfigService.instance, 'clearUser').mockResolvedValue();
    const validateTokensSpy = vi
      .spyOn(ValidationService.instance, 'validateTokenAndCheckExpiration')
      .mockReturnValueOnce({ expiration: { expired: false, refreshRequired: false }, isValid: true });
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
});
