import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils, LogReporter } from '../utils/cli.utils';
import {
  LoginCredentials,
  MissingCredentialsError,
  NotValidWorkspaceUuidError,
  Workspace,
} from '../types/command.types';
import { WorkspaceService } from '../services/drive/workspace.service';
import { FormatUtils } from '../utils/format.utils';
import { ValidationService } from '../services/validation.service';
import { SdkManager } from '../services/sdk-manager.service';
import WorkspacesUnset from './workspaces-unset';
import { DatabaseService } from '../services/database/database.service';

export default class WorkspacesUse extends Command {
  static readonly args = {};
  static readonly description =
    'Set the active workspace context for the current user session. ' +
    'Once a workspace is selected, WebDAV and all of the subsequent CLI commands ' +
    'will operate within that workspace until it is changed or unset.';
  static readonly aliases = ['workspaces:use'];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {
    ...CLIUtils.CommonFlags,
    id: Flags.string({
      char: 'i',
      description:
        'The id of the workspace to activate. ' +
        'Use <%= config.bin %> workspaces list to view your available workspace ids.',
      required: false,
      exclusive: ['personal'],
    }),
    personal: Flags.boolean({
      char: 'p',
      description:
        'Change to the personal drive space. It unsets the active workspace context for the current user session.',
      required: false,
    }),
  };
  static readonly enableJsonFlag = true;

  public run = async () => {
    const { flags } = await this.parse(WorkspacesUse);
    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const reporter = this.log.bind(this);

    if (flags['personal']) {
      return WorkspacesUnset.unsetWorkspace(userCredentials, reporter);
    }

    const workspace = await this.getWorkspace(userCredentials, flags['id'], nonInteractive, reporter);

    await this.setWorkspace(userCredentials, workspace);

    const message =
      `Workspace ${workspace.workspaceCredentials.id} selected successfully. Now WebDAV and ` +
      'all of the CLI commands will operate within this workspace until it is changed or unset.';
    CLIUtils.success(reporter, message);

    return { success: true, workspace };
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
    reporter: LogReporter,
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
      reporter,
    );
    return this.extractUuidFromWorkspaceString(workspaceUuid);
  };

  private extractUuidFromWorkspaceString = (workspaceString: string) =>
    workspaceString.match(/\[(.*?)\]/)?.[1] ?? workspaceString;

  private getWorkspace = async (
    userCredentials: LoginCredentials,
    workspaceUuidFlag: string | undefined,
    nonInteractive: boolean,
    reporter: LogReporter,
  ): Promise<Workspace> => {
    const workspaces = await WorkspaceService.instance.getAvailableWorkspaces(userCredentials.user);
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
    const workspaceUuid = await this.getWorkspaceUuid(workspaceUuidFlag, availableWorkspaces, nonInteractive, reporter);

    const workspaceCredentials = await WorkspaceService.instance.getWorkspaceCredentials(workspaceUuid);
    const selectedWorkspace = workspaces.find((workspace) => workspace.workspace.id === workspaceUuid);
    if (!selectedWorkspace) throw new NotValidWorkspaceUuidError();

    return { workspaceCredentials, workspaceData: selectedWorkspace };
  };

  private setWorkspace = async (userCredentials: LoginCredentials, workspace: Workspace) => {
    SdkManager.init({ token: userCredentials.token, workspaceToken: workspace.workspaceCredentials.token });

    await ConfigService.instance.saveUser({
      ...userCredentials,
      workspace,
    });

    void DatabaseService.instance.clear();
  };
}
