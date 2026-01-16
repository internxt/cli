import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { MissingCredentialsError, NotValidWorkspaceUuidError } from '../types/command.types';
import { WorkspaceService } from '../services/drive/workspace.service';
import { FormatUtils } from '../utils/format.utils';
import { ValidationService } from '../services/validation.service';
import { SdkManager } from '../services/sdk-manager.service';

export default class WorkspacesUse extends Command {
  static readonly args = {};
  static readonly description =
    'Set the active workspace context for the current user session. ' +
    'Once a workspace is selected, all subsequent commands (list, upload, download, etc.) ' +
    'will operate within that workspace until it is changed or unset.';
  static readonly aliases = ['workspaces:use', 'ws-use', 'ws:use'];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {
    ...CLIUtils.CommonFlags,
    id: Flags.string({
      char: 'i',
      description:
        'The id of the workspace to activate. ' +
        'Use <%= config.bin %> workspaces list to view your available workspace ids.',
      required: false,
    }),
  };
  static readonly enableJsonFlag = true;

  public run = async () => {
    const { flags } = await this.parse(WorkspacesUse);
    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const workspaces = await WorkspaceService.instance.getAvailableWorkspaces();
    const availableWorkspaces: string[] = workspaces.map((workspaceData) => {
      const name = workspaceData.workspace.name;
      const id = workspaceData.workspace.id;
      const totalUsedSpace =
        Number(workspaceData.workspaceUser?.driveUsage ?? 0) + Number(workspaceData.workspaceUser?.backupsUsage ?? 0);
      const spaceLimit = Number(workspaceData.workspaceUser?.spaceLimit ?? 0);
      const usedSpace = FormatUtils.humanFileSize(totalUsedSpace);
      const availableSpace = FormatUtils.formatLimit(spaceLimit);

      return `[${id}] Name: ${name} | Used Space: ${usedSpace} | Available Space: ${availableSpace}`;
    });
    const workspaceUuid = await this.getWorkspaceUuid(flags['id'], availableWorkspaces, nonInteractive);

    const workspaceCredentials = await WorkspaceService.instance.getWorkspaceCredentials(workspaceUuid);
    const selectedWorkspace = workspaces.find((workspace) => workspace.workspace.id === workspaceUuid);
    if (!selectedWorkspace) throw new NotValidWorkspaceUuidError();

    SdkManager.init({ token: userCredentials.token, workspaceToken: workspaceCredentials.token });

    await ConfigService.instance.saveUser({
      ...userCredentials,
      workspace: {
        workspaceCredentials,
        workspaceData: selectedWorkspace,
      },
    });

    const message =
      `Workspace ${workspaceUuid} selected successfully. Now all drive commands (list, upload, download, etc.) ` +
      'will operate within this workspace until it is changed or unset.';
    CLIUtils.success(this.log.bind(this), message);

    return { success: true, list: { workspaces } };
  };

  public catch = async (error: Error) => {
    const { flags } = await this.parse(WorkspacesUse);
    CLIUtils.catchError({
      error,
      command: this.id,
      logReporter: this.log.bind(this),
      jsonFlag: flags['json'],
    });
    this.exit(1);
  };

  private getWorkspaceUuid = async (
    workspaceUuidFlag: string | undefined,
    availableWorkspaces: string[],
    nonInteractive: boolean,
  ): Promise<string> => {
    const workspaceUuid = await CLIUtils.getValueFromFlag(
      {
        value: workspaceUuidFlag ? `[${workspaceUuidFlag}]` : undefined,
        name: WorkspacesUse.flags['id'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is the workspace you want to use?',
          options: {
            type: 'list',
            choices: { values: availableWorkspaces },
          },
        },
      },
      {
        validate: (value: string) =>
          ValidationService.instance.validateUUIDv4(this.extractUuidFromWorkspaceString(value)),
        error: new NotValidWorkspaceUuidError(),
      },
      this.log.bind(this),
    );
    return this.extractUuidFromWorkspaceString(workspaceUuid);
  };

  private extractUuidFromWorkspaceString = (workspaceString: string) =>
    workspaceString.match(/\[(.*?)\]/)?.[1] ?? workspaceString;
}
