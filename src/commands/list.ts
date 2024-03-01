import { Command, Flags, ux } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { CLIUtils } from '../utils/cli.utils';
import { MissingCredentialsError, NotValidFolderUuidError, PaginatedItem } from '../types/command.types';
import { ValidationService } from '../services/validation.service';
import { FormatUtils } from '../utils/format.utils';

export default class List extends Command {
  static readonly args = {};
  static readonly description = 'Lists the content of a folder id.';

  static readonly examples = ['<%= config.bin %> <%= command.id %>'];

  static readonly flags = {
    ...CLIUtils.CommonFlags,
    id: Flags.string({
      char: 'f',
      description: 'The folder id to list. Leave empty for the root folder.',
      required: false,
      parse: async (input: string) => (input.trim().length === 0 ? ' ' : input),
    }),
    ...ux.table.flags(),
  };

  public async run() {
    const { flags } = await this.parse(List);

    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    let folderUuid = await this.getFolderUuid(flags['id'], nonInteractive);

    if (folderUuid.trim().length === 0) {
      // folderId is empty from flags&prompt, which means we should use RootFolderUuid
      const rootFolderId = userCredentials.user.root_folder_id;
      const rootFolderMeta = await DriveFolderService.instance.getFolderMetaById(rootFolderId);
      folderUuid = rootFolderMeta.uuid;
    }

    const { folders, files } = await DriveFolderService.instance.getFolderContent(folderUuid);

    const allItems: PaginatedItem[] = [
      ...folders.map((folder) => {
        return {
          isFolder: true,
          plainName: folder.plainName,
          uuid: folder.uuid,
          type: '',
          size: BigInt(0),
          updatedAt: folder.updatedAt,
        };
      }),
      ...files.map((file) => {
        return {
          isFolder: false,
          plainName: file.plainName,
          uuid: file.uuid,
          type: file.type,
          size: file.size,
          updatedAt: file.updatedAt,
        };
      }),
    ];
    ux.table(
      allItems,
      {
        type: {
          header: '',
          get: (row) => {
            if (flags.output) {
              return row.isFolder ? 'folder' : 'file';
            } else {
              return row.isFolder ? '🗁  ' : '🗎 ';
            }
          },
        },
        name: {
          header: 'Name',
          get: (row) => (row.isFolder ? row.plainName : `${row.plainName}.${row.type}`),
        },
        updatedAt: {
          header: 'Modified',
          get: (row) => {
            if (flags.output) {
              return row.updatedAt;
            } else {
              return FormatUtils.formatDate(row.updatedAt);
            }
          },
          extended: true,
        },
        size: {
          header: 'Size',
          get: (row) => {
            if (flags.output) {
              return row.isFolder ? '0' : row.size;
            } else {
              return row.isFolder ? '' : FormatUtils.humanFileSize(Number(row.size));
            }
          },
          extended: true,
        },
        uuid: {
          header: 'ID',
          get: (row) => row.uuid,
        },
      },
      {
        printLine: this.log.bind(this),
        ...flags,
      },
    );
  }

  async catch(error: Error) {
    CLIUtils.error(error.message);
    this.exit(1);
  }

  public getFolderUuid = async (folderUuidFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    let folderUuid = CLIUtils.getValueFromFlag(
      {
        value: folderUuidFlag,
        name: List.flags['id'].name,
        error: new NotValidFolderUuidError(),
        canBeEmpty: true,
      },
      nonInteractive,
      (folderUuid: string) => ValidationService.instance.validateUUIDv4(folderUuid),
    );
    if (!folderUuid && folderUuid !== '') {
      folderUuid = (await this.getFolderUuidInteractively()).trim();
    }
    return folderUuid;
  };

  public getFolderUuidInteractively = (): Promise<string> => {
    return CLIUtils.prompt({
      message: 'What is the folder id you want to list? (leave empty for the root folder)',
      options: { required: false },
      error: new NotValidFolderUuidError(),
    });
  };
}
