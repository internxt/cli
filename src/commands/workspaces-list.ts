import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { MissingCredentialsError, PaginatedWorkspace } from '../types/command.types';
import { WorkspaceService } from '../services/drive/workspace.service';
import { Header } from 'tty-table';
import { FormatUtils } from '../utils/format.utils';

export default class WorkspacesList extends Command {
  static readonly args = {};
  static readonly description = 'Get the list of workspaces.';
  static readonly aliases = ['workspaces:list', 'ws-list', 'ws:list'];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {
    ...CLIUtils.CommonFlags,
    extended: Flags.boolean({
      char: 'e',
      description: 'Displays additional information in the list.',
      required: false,
    }),
  };
  static readonly enableJsonFlag = true;

  public run = async () => {
    const { flags } = await this.parse(WorkspacesList);

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const workspaces = await WorkspaceService.instance.getAvailableWorkspaces();

    const allItems: PaginatedWorkspace[] = workspaces.map((workspaceData) => {
      const totalUsedSpace =
        Number(workspaceData.workspaceUser?.driveUsage ?? 0) + Number(workspaceData.workspaceUser?.backupsUsage ?? 0);
      const spaceLimit = Number(workspaceData.workspaceUser?.spaceLimit ?? 0);
      const usedSpace = FormatUtils.humanFileSize(totalUsedSpace);
      const availableSpace = FormatUtils.formatLimit(spaceLimit);

      return {
        name: workspaceData.workspace.name,
        id: workspaceData.workspace.id,
        usedSpace,
        availableSpace,
        owner: workspaceData.workspace.ownerId,
        address: workspaceData.workspace.address,
        created: FormatUtils.formatDate(workspaceData.workspace.createdAt),
      };
    });

    const headers: Header[] = [
      { value: 'name', alias: 'Name' },
      { value: 'id', alias: 'Workspace ID' },
      { value: 'usedSpace', alias: 'Used space' },
      { value: 'availableSpace', alias: 'Available space' },
    ];
    if (flags.extended) {
      headers.push(
        { value: 'owner', alias: 'Owner ID' },
        { value: 'address', alias: 'Address' },
        { value: 'created', alias: 'Created at' },
      );
    }
    CLIUtils.table(this.log.bind(this), headers, allItems);

    return { success: true, list: { workspaces } };
  };

  public catch = async (error: Error) => {
    const { flags } = await this.parse(WorkspacesList);
    CLIUtils.catchError({
      error,
      command: this.id,
      logReporter: this.log.bind(this),
      jsonFlag: flags['json'],
    });
    this.exit(1);
  };
}
