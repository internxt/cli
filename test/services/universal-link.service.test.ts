import { beforeEach, describe, expect, test, vi } from 'vitest';
import { UniversalLinkService } from '../../src/services/universal-link.service';
import { AuthService } from '../../src/services/auth.service';
import { ConfigService } from '../../src/services/config.service';
import { CLIUtils } from '../../src/utils/cli.utils';
import { newApiError, newClientVersionUnsupportedError } from '../fixtures/errors.fixture';

vi.mock('open', () => ({ default: vi.fn().mockResolvedValue(undefined) }));

const DRIVE_WEB_URL = 'https://drive.example.com';

const runFailedCallback = async (refreshError: unknown) => {
  vi.spyOn(AuthService.instance, 'refreshUserToken').mockRejectedValue(refreshError);

  let loginUrl = '';
  vi.spyOn(CLIUtils, 'consoleLog').mockImplementation((message: string) => {
    loginUrl = message;
  });

  const loginPromise = UniversalLinkService.instance.loginSSO(false, vi.fn());
  const loginRejection = expect(loginPromise).rejects.toBe(refreshError);
  await vi.waitFor(() => expect(loginUrl).not.toBe(''));

  const redirectUri = Buffer.from(new URL(loginUrl).searchParams.get('redirectUri') ?? '', 'base64').toString();
  const callbackUrl = new URL(redirectUri);
  callbackUrl.searchParams.set('mnemonic', Buffer.from('mnemonic').toString('base64'));
  callbackUrl.searchParams.set('newToken', Buffer.from('token').toString('base64'));
  callbackUrl.searchParams.set('privateKey', Buffer.from('key').toString('base64'));

  const response = await fetch(callbackUrl, { redirect: 'manual' });
  await loginRejection;
  return response.headers.get('location');
};

describe('Universal link service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(ConfigService.instance, 'get').mockReturnValue(DRIVE_WEB_URL);
  });

  test('when the login is blocked for the CLI version, then the browser is sent to the error page with the reason', async () => {
    const location = await runFailedCallback(newClientVersionUnsupportedError());

    expect(location).toBe(`${DRIVE_WEB_URL}/auth-link-error?reason=CLIENT_VERSION_UNSUPPORTED`);
  });

  test('when the login fails for another reason, then the browser is sent to the generic error page', async () => {
    const location = await runFailedCallback(newApiError(401, { data: { message: 'Unauthorized' } }));

    expect(location).toBe(`${DRIVE_WEB_URL}/auth-link-error`);
  });
});
