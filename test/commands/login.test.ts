import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ConfigService } from '../../src/services/config.service';
import { UserCredentialsFixture, UserLoginFixture } from '../fixtures/login.fixture';
import { fail } from 'node:assert';
import Login from '../../src/commands/login';
import { AuthService } from '../../src/services/auth.service';
import { CLIUtils, NoFlagProvidedError } from '../../src/utils/cli.utils';

describe('Login Command', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When user logs in with non-interactive and no email, then it throws error', async () => {
    const getValueFromFlagsSpy = vi
      .spyOn(CLIUtils, 'getValueFromFlag')
      .mockRejectedValueOnce(new NoFlagProvidedError('email')) // email
      .mockRejectedValueOnce(new Error()) // password
      .mockRejectedValueOnce(new Error()) // two factor code
      .mockRejectedValue(new Error()); // default
    const is2FaNeededSpy = vi.spyOn(AuthService.instance, 'is2FANeeded').mockRejectedValue(new Error());
    const doLoginSpy = vi.spyOn(AuthService.instance, 'doLogin').mockRejectedValue(new Error());
    const saveUserSpy = vi.spyOn(ConfigService.instance, 'saveUser').mockRejectedValue(new Error());

    try {
      await Login.run(['--non-interactive', `--password="${UserLoginFixture.password}"`]);
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.contain(new NoFlagProvidedError('email').message);
    }

    expect(getValueFromFlagsSpy).toHaveBeenCalledOnce();
    expect(is2FaNeededSpy).not.toHaveBeenCalled();
    expect(doLoginSpy).not.toHaveBeenCalled();
    expect(saveUserSpy).not.toHaveBeenCalled();
  });

  it('When user logs in with non-interactive and no password, then it throws error', async () => {
    const getValueFromFlagsSpy = vi
      .spyOn(CLIUtils, 'getValueFromFlag')
      .mockResolvedValueOnce(UserLoginFixture.email) // email
      .mockRejectedValueOnce(new NoFlagProvidedError('password')) // password
      .mockRejectedValueOnce(new Error()) // two factor code
      .mockRejectedValue(new Error()); // default
    const is2FaNeededSpy = vi.spyOn(AuthService.instance, 'is2FANeeded').mockRejectedValue(new Error());
    const doLoginSpy = vi.spyOn(AuthService.instance, 'doLogin').mockRejectedValue(new Error());
    const saveUserSpy = vi.spyOn(ConfigService.instance, 'saveUser').mockRejectedValue(new Error());

    try {
      await Login.run(['--non-interactive', `--email="${UserLoginFixture.email}"`]);
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.contain(new NoFlagProvidedError('password').message);
    }

    expect(getValueFromFlagsSpy).toHaveBeenCalledTimes(2);
    expect(is2FaNeededSpy).not.toHaveBeenCalled();
    expect(doLoginSpy).not.toHaveBeenCalled();
    expect(saveUserSpy).not.toHaveBeenCalled();
  });

  it('When user logs in with non-interactive and no two factor code, then it throws error', async () => {
    const getValueFromFlagsSpy = vi
      .spyOn(CLIUtils, 'getValueFromFlag')
      .mockResolvedValueOnce(UserLoginFixture.email) // email
      .mockResolvedValueOnce(UserLoginFixture.password) // password
      .mockRejectedValueOnce(new NoFlagProvidedError('twofactor')) // two factor code
      .mockRejectedValue(new Error()); // default
    const is2FaNeededSpy = vi.spyOn(AuthService.instance, 'is2FANeeded').mockResolvedValue(true);
    const doLoginSpy = vi.spyOn(AuthService.instance, 'doLogin').mockRejectedValue(new Error());
    const saveUserSpy = vi.spyOn(ConfigService.instance, 'saveUser').mockRejectedValue(new Error());

    try {
      await Login.run([
        '--non-interactive',
        `--email="${UserLoginFixture.email}"`,
        `--password="${UserLoginFixture.password}"`,
      ]);
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.contain(new NoFlagProvidedError('twofactor').message);
    }

    expect(getValueFromFlagsSpy).toHaveBeenCalledTimes(3);
    expect(is2FaNeededSpy).toHaveBeenCalledOnce();
    expect(doLoginSpy).not.toHaveBeenCalled();
    expect(saveUserSpy).not.toHaveBeenCalled();
  });

  it('When two factor is not needed, then it saves and returns the credentials', async () => {
    const getValueFromFlagsSpy = vi
      .spyOn(CLIUtils, 'getValueFromFlag')
      .mockResolvedValueOnce(UserLoginFixture.email) // email
      .mockResolvedValueOnce(UserLoginFixture.password) // password
      .mockRejectedValueOnce(new Error()) // two factor code
      .mockRejectedValue(new Error()); // default
    const is2FaNeededSpy = vi.spyOn(AuthService.instance, 'is2FANeeded').mockResolvedValue(false);
    const doLoginSpy = vi.spyOn(AuthService.instance, 'doLogin').mockResolvedValue(UserCredentialsFixture);
    const saveUserSpy = vi.spyOn(ConfigService.instance, 'saveUser').mockResolvedValue();

    const message = `Succesfully logged in to: ${UserCredentialsFixture.user.email}`;
    const expected = { success: true, message, login: UserCredentialsFixture };

    const result = await Login.run([
      `--email="${UserLoginFixture.email}"`,
      `--password="${UserLoginFixture.password}"`,
    ]);

    expect(result).to.be.deep.equal(expected);
    expect(getValueFromFlagsSpy).toHaveBeenCalledTimes(2);
    expect(is2FaNeededSpy).toHaveBeenCalledOnce();
    expect(doLoginSpy).toHaveBeenCalledOnce();
    expect(saveUserSpy).toHaveBeenCalledOnce();
  });

  it('When two factor is needed, then it saves and returns the credentials', async () => {
    const getValueFromFlagsSpy = vi
      .spyOn(CLIUtils, 'getValueFromFlag')
      .mockResolvedValueOnce(UserLoginFixture.email) // email
      .mockResolvedValueOnce(UserLoginFixture.password) // password
      .mockResolvedValueOnce(UserLoginFixture.twoFactor) // two factor code
      .mockRejectedValue(new Error()); // default
    const is2FaNeededSpy = vi.spyOn(AuthService.instance, 'is2FANeeded').mockResolvedValue(true);
    const doLoginSpy = vi.spyOn(AuthService.instance, 'doLogin').mockResolvedValue(UserCredentialsFixture);
    const saveUserSpy = vi.spyOn(ConfigService.instance, 'saveUser').mockResolvedValue();

    const message = `Succesfully logged in to: ${UserCredentialsFixture.user.email}`;
    const expected = { success: true, message, login: UserCredentialsFixture };

    const result = await Login.run([
      `--email="${UserLoginFixture.email}"`,
      `--password="${UserLoginFixture.password}"`,
      `--twofactor="${UserLoginFixture.twoFactor}"`,
    ]);

    expect(result).to.be.deep.equal(expected);
    expect(getValueFromFlagsSpy).toHaveBeenCalledTimes(3);
    expect(is2FaNeededSpy).toHaveBeenCalledOnce();
    expect(doLoginSpy).toHaveBeenCalledOnce();
    expect(saveUserSpy).toHaveBeenCalledOnce();
  });
});
