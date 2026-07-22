import { LoginDetails } from '@internxt/sdk';
import { SdkManager } from './sdk-manager.service';
import { CacheService } from './cache.service';
import { CryptoService } from './crypto.service';
import { ConfigService } from './config.service';
import {
  ExpiredCredentialsError,
  InvalidCredentialsError,
  LoginCredentials,
  MissingCredentialsError,
  Workspace,
} from '../types/command.types';
import { ValidationService } from './validation.service';
import { WorkspaceService } from './drive/workspace.service';
import { TokenStatus } from '@internxt/lib';

export class AuthService {
  public static readonly instance: AuthService = new AuthService();

  /**
   * Login with user credentials and returns its tokens and properties
   * @param email The user's email
   * @param password The user's password
   * @param twoFactorCode (Optional) The temporal two factor auth code
   * @returns The user's properties and the tokens needed for auth
   * @async
   **/
  public doLogin = async (email: string, password: string, twoFactorCode?: string): Promise<LoginCredentials> => {
    const authClient = SdkManager.instance.getAuth();
    const loginDetails: LoginDetails = {
      email: email.toLowerCase(),
      password: password,
      tfaCode: twoFactorCode,
    };

    const data = await authClient.loginAccess(loginDetails, CryptoService.cryptoProvider);
    const { user, newToken } = data;

    const clearMnemonic = CryptoService.instance.decryptTextWithKey(user.mnemonic, password);
    const clearPrivateKey = Buffer.from(
      CryptoService.instance.decryptPrivateKey(user.keys.ecc.privateKey, password),
    ).toString('base64');
    user.keys.ecc.privateKey = clearPrivateKey;
    if (user.keys?.kyber?.privateKey) {
      user.keys.kyber.privateKey = Buffer.from(
        CryptoService.instance.decryptPrivateKey(user.keys.kyber.privateKey, password),
      ).toString('base64');
    }
    const clearUser: LoginCredentials['user'] = {
      ...user,
      mnemonic: clearMnemonic,
    };

    return {
      user: clearUser,
      token: newToken,
    };
  };

  /**
   * Checks from user's security details if it has enabled two factor auth
   * @param email The user's email
   * @throws {Error} If auth.securityDetails endpoint fails
   * @returns True if user has enabled two factor auth
   * @async
   **/
  public is2FANeeded = async (email: string): Promise<boolean> => {
    const authClient = SdkManager.instance.getAuth();
    const securityDetails = await authClient.securityDetails(email).catch((error) => {
      throw new Error(error.message ?? 'Login error');
    });
    return securityDetails.tfaEnabled;
  };

  /**
   * Checks and returns the user auth details (it refreshes the tokens if needed)
   *
   * @returns The user details and the auth tokens
   * @throws {MissingCredentialsError} When user credentials are not found
   * @throws {InvalidCredentialsError} When token or mnemonic is invalid
   * @throws {ExpiredCredentialsError} When token has expired
   */
  public getAuthDetails = async (): Promise<LoginCredentials> => {
    let loginCreds = await ConfigService.instance.readUser();
    if (!loginCreds?.token || !loginCreds?.user?.mnemonic) {
      throw new MissingCredentialsError();
    }

    const tokenStatus = ValidationService.instance.validateTokenAndCheckExpiration(loginCreds.token);
    const isValidMnemonic = ValidationService.instance.validateMnemonic(loginCreds.user.mnemonic);

    if (tokenStatus === TokenStatus.INVALID || !isValidMnemonic) {
      throw new InvalidCredentialsError();
    }
    if (tokenStatus === TokenStatus.EXPIRED) {
      throw new ExpiredCredentialsError();
    }

    let credentialsChanged = false;

    if (tokenStatus === TokenStatus.REFRESH_REQUIRED) {
      try {
        loginCreds = await this.refreshUserToken(
          loginCreds.token,
          loginCreds.user.mnemonic,
          loginCreds.user.keys.ecc.privateKey,
        );
        credentialsChanged = true;
      } catch (error) {
        if (this.shouldClearUserAfterRefreshError(error)) {
          await ConfigService.instance.clearUser();
        }
        throw error;
      }
    }

    const workspaceCreds = await this.refreshWorkspaceCredentials(loginCreds);
    if (workspaceCreds !== loginCreds.workspace) {
      credentialsChanged = true;
    }
    loginCreds.workspace = workspaceCreds;

    SdkManager.init({ token: loginCreds.token, workspaceToken: workspaceCreds?.workspaceCredentials.token });

    if (credentialsChanged) {
      await ConfigService.instance.saveUser(loginCreds);
    }
    return loginCreds;
  };

  private readonly shouldClearUserAfterRefreshError = (error: unknown): boolean => {
    if (error instanceof InvalidCredentialsError || error instanceof ExpiredCredentialsError) {
      return true;
    }

    const status = this.getHttpStatusFromError(error);
    if (status === undefined) {
      return false;
    }

    return status >= 400 && status < 500 && status !== 408 && status !== 429;
  };

  private readonly getHttpStatusFromError = (error: unknown): number | undefined => {
    if (typeof error !== 'object' || error === null) {
      return undefined;
    }

    const response = 'response' in error ? (error as { response?: { status?: unknown } }).response : undefined;
    if (typeof response?.status === 'number') {
      return response.status;
    }

    const status = 'status' in error ? (error as { status?: unknown }).status : undefined;
    if (typeof status === 'number') {
      return status;
    }

    const statusCode = 'statusCode' in error ? (error as { statusCode?: unknown }).statusCode : undefined;
    return typeof statusCode === 'number' ? statusCode : undefined;
  };

  /**
   * Refreshes the user tokens
   *
   * @returns The user details and the renewed auth token
   * @throws {InvalidCredentialsError} When the mnemonic is invalid
   */
  public refreshUserToken = async (
    oldToken: string,
    mnemonic: string,
    privateKey: string,
  ): Promise<LoginCredentials> => {
    SdkManager.init({ token: oldToken });

    const isValidMnemonic = ValidationService.instance.validateMnemonic(mnemonic);
    if (!isValidMnemonic) {
      throw new InvalidCredentialsError();
    }

    const usersClient = SdkManager.instance.getUsers();
    const newCreds = await usersClient.refreshUserCredentials();

    SdkManager.init({ token: newCreds.newToken });

    const newLoginCreds: LoginCredentials = {
      user: {
        ...newCreds.user,
        mnemonic: mnemonic,
        keys: {
          ecc: {
            privateKey: privateKey,
            publicKey: newCreds.user.keys.ecc.publicKey,
          },
          kyber: {
            privateKey: newCreds.user.keys.kyber.privateKey,
            publicKey: newCreds.user.keys.kyber.publicKey,
          },
        },
      },
      token: newCreds.newToken,
    };

    return newLoginCreds;
  };

  /**
   * Returns the workspace details and refreshes them if needed
   *
   * @returns The workspace details and the renewed auth token
   * @throws {InvalidCredentialsError} When the workspace token is invalid
   * @throws {ExpiredCredentialsError} When the workspace token has expired
   */
  public refreshWorkspaceCredentials = async (loginCreds: LoginCredentials): Promise<Workspace | undefined> => {
    if (loginCreds.workspace?.workspaceCredentials && loginCreds.workspace?.workspaceData) {
      const workspaceToken = loginCreds.workspace.workspaceCredentials.token;
      const workspaceUuid = loginCreds.workspace.workspaceCredentials.id;
      const workspaceTokenStatus = ValidationService.instance.validateTokenAndCheckExpiration(workspaceToken);

      if (workspaceTokenStatus === TokenStatus.VALID) {
        return loginCreds.workspace;
      } else if (workspaceTokenStatus === TokenStatus.INVALID) {
        throw new InvalidCredentialsError();
      } else if (workspaceTokenStatus === TokenStatus.EXPIRED) {
        throw new ExpiredCredentialsError();
      } else if (workspaceTokenStatus === TokenStatus.REFRESH_REQUIRED) {
        SdkManager.init({ token: loginCreds.token, workspaceToken: loginCreds.workspace.workspaceCredentials.token });
        const workspaceCredentials = await WorkspaceService.instance.getWorkspaceCredentials(workspaceUuid);
        // TODO [PB-5788] Refresh workspace data when workspace token requires refresh
        return {
          workspaceCredentials,
          workspaceData: loginCreds.workspace.workspaceData,
        };
      }
    }
  };

  public getCurrentWorkspace = async (): Promise<Workspace | undefined> => {
    const loginCreds = await ConfigService.instance.readUser();
    if (!loginCreds?.token || !loginCreds?.user?.mnemonic) {
      throw new MissingCredentialsError();
    }
    return loginCreds.workspace;
  };

  public getCurrentRootFolder = async (): Promise<string> => {
    const loginCreds = await ConfigService.instance.readUser();
    if (!loginCreds?.token || !loginCreds?.user?.mnemonic) {
      throw new MissingCredentialsError();
    }
    return loginCreds.workspace?.workspaceData?.workspaceUser?.rootFolderId ?? loginCreds.user.rootFolderId;
  };

  /**
   * Logs the user out of the application by invoking the logout method
   * from the authentication client. This will terminate the user's session
   * and clear any associated authentication data.
   *
   * @returns A promise that resolves when the logout process is complete.
   */
  public logout = async (): Promise<void> => {
    CacheService.instance.clearCaches();

    try {
      const user = await ConfigService.instance.readUser();
      if (!user?.token) {
        return;
      }
      const authClient = SdkManager.instance.getAuth();
      return authClient.logout(user.token);
    } catch {
      //no op
    }
  };
}
