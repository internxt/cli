import { WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { SdkManager } from '../sdk-manager.service';
import { LoginCredentials, WorkspaceCredentialsDetails } from '../../types/command.types';
import { CryptoService } from '../crypto.service';

export class WorkspaceService {
  static readonly instance = new WorkspaceService();

  public getAvailableWorkspaces = async (user: LoginCredentials['user']): Promise<WorkspaceData[]> => {
    const workspacesClient = SdkManager.instance.getWorkspaces();
    const workspaces = await workspacesClient.getWorkspaces();
    const decryptedMnemonicWorkspaces = await CryptoService.instance.decryptWorkspacesMnemonic(
      workspaces.availableWorkspaces,
      user,
    );
    return decryptedMnemonicWorkspaces;
  };

  public getWorkspaceCredentials = async (workspaceId: string): Promise<WorkspaceCredentialsDetails> => {
    const workspacesClient = SdkManager.instance.getWorkspaces();
    const workspaceCredentialsRaw = await workspacesClient.getWorkspaceCredentials(workspaceId);

    const workspaceCredentials: WorkspaceCredentialsDetails = {
      id: workspaceCredentialsRaw.workspaceId,
      bucket: workspaceCredentialsRaw.bucket,
      workspaceUserId: workspaceCredentialsRaw.workspaceUserId,
      credentials: {
        user: workspaceCredentialsRaw.credentials.networkUser,
        pass: workspaceCredentialsRaw.credentials.networkPass,
      },
      token: workspaceCredentialsRaw.tokenHeader,
    };
    return workspaceCredentials;
  };
}
