import http from 'node:http';
import open from 'open';
import { AddressInfo } from 'node:net';
import { LoginCredentials } from '../types/command.types';
import { ConfigService } from './config.service';
import { AuthService } from './auth.service';
import { CLIUtils } from '../utils/cli.utils';

export class UniversalLinkService {
  public static readonly instance: UniversalLinkService = new UniversalLinkService();

  public getUserCredentials = async (userSession: { mnemonic: string; token: string }): Promise<LoginCredentials> => {
    const clearMnemonic = Buffer.from(userSession.mnemonic, 'base64').toString('utf-8');
    const clearToken = Buffer.from(userSession.token, 'base64').toString('utf-8');
    const loginCredentials = await AuthService.instance.refreshUserToken(clearToken, clearMnemonic);
    return {
      user: {
        ...loginCredentials.user,
        mnemonic: clearMnemonic,
      },
      token: clearToken,
    };
  };

  public buildLoginUrl = (redirectUri: string) => {
    const loginURL = `${ConfigService.instance.get('DRIVE_WEB_URL')}/login`;
    const params = new URLSearchParams({
      universalLink: 'true',
      redirectUri: redirectUri,
    });
    return `${loginURL}?${params.toString()}`;
  };

  public loginSSO = async (
    jsonFlag: boolean,
    reporter: (message: string) => void,
    hostIp = '127.0.0.1',
    forcedPort = 0,
  ): Promise<LoginCredentials> => {
    return new Promise<LoginCredentials>((resolve, reject) => {
      const server = http.createServer(async (req, res) => {
        if (!req.url) return;
        const parsedUrl = new URL(req.url, `http://${req.headers.host}`);

        const driveUrl = ConfigService.instance.get('DRIVE_WEB_URL');

        try {
          const mnemonic = parsedUrl.searchParams.get('mnemonic');
          const token = parsedUrl.searchParams.get('newToken');
          if (!mnemonic || !token) {
            throw new Error('Login has failed, please try again');
          }

          const loginCredentials = await this.getUserCredentials({ mnemonic, token });

          res.writeHead(302, {
            Location: `${driveUrl}/auth-link-ok`,
          });
          res.end();

          resolve(loginCredentials);
        } catch (error) {
          res.writeHead(302, {
            Location: `${driveUrl}/auth-link-error`,
          });
          res.end();
          reject(error);
        } finally {
          server.closeAllConnections();
          server.close();
        }
      });

      server.listen(forcedPort, async () => {
        const { port } = server.address() as AddressInfo;

        const redirectUri = Buffer.from(`http://${hostIp}:${port}/callback`).toString('base64');
        const loginUrl = this.buildLoginUrl(redirectUri);

        CLIUtils.log(reporter, 'Opening browser for login...');
        CLIUtils.log(reporter, 'If the browser doesn’t open automatically, visit:');

        const printLoginUrl = jsonFlag ? `{ "loginUrl": "${loginUrl}" }` : loginUrl;

        CLIUtils.consoleLog(printLoginUrl);

        try {
          await open(loginUrl);
        } catch {
          CLIUtils.warning(reporter, 'Could not open browser automatically.');
        }
        CLIUtils.log(reporter, 'Waiting for authentication...');
      });
    });
  };
}
