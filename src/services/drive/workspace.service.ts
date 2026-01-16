import { WorkspaceData } from '@internxt/sdk/dist/workspaces';
import { SdkManager } from '../sdk-manager.service';
import { WorkspaceCredentialsDetails } from '../../types/command.types';

export class WorkspaceService {
  static readonly instance = new WorkspaceService();

  public getAvailableWorkspaces = async (): Promise<WorkspaceData[]> => {
    const workspacesClient = SdkManager.instance.getWorkspaces();
    const workspaces = await workspacesClient.getWorkspaces();
    return workspaces.availableWorkspaces;
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
