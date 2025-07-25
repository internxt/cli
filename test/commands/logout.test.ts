import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../../src/services/config.service';
import { UserCredentialsFixture } from '../fixtures/login.fixture';
import Logout from '../../src/commands/logout';
import { AuthService } from '../../src/services/auth.service';

describe('Logout Command', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When user is logged out, then it returns false', async () => {
    const readUserSpy = vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(undefined);
    const networkLogout = vi.spyOn(AuthService.instance, 'logout').mockRejectedValue(new Error());
    const clearUserSpy = vi.spyOn(ConfigService.instance, 'clearUser').mockRejectedValue(new Error());

    const message = 'No user is currently logged in.';
    const expected = { success: false, message };

    const result = await Logout.run();

    expect(result).to.be.deep.equal(expected);
    expect(readUserSpy).toHaveBeenCalledOnce();
    expect(networkLogout).not.toHaveBeenCalled();
    expect(clearUserSpy).not.toHaveBeenCalled();
  });

  it('When user is logged in, then the current user logged out', async () => {
    const readUserSpy = vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(UserCredentialsFixture);
    const networkLogout = vi.spyOn(AuthService.instance, 'logout').mockResolvedValue();
    const clearUserSpy = vi.spyOn(ConfigService.instance, 'clearUser').mockResolvedValue();

    const message = 'User logged out successfully.';
    const expected = { success: true, message };

    const result = await Logout.run();

    expect(result).to.be.deep.equal(expected);
    expect(readUserSpy).toHaveBeenCalledOnce();
    expect(networkLogout).toHaveBeenCalledOnce();
    expect(clearUserSpy).toHaveBeenCalledOnce();
  });
});
