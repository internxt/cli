import { Command, Flags, ux } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { CLIUtils } from '../utils/cli.utils';
import { MissingCredentialsError, NotValidFolderUuidError, PaginatedItem } from '../types/command.types';
import { ValidationService } from '../services/validation.service';
import { FormatUtils } from '../utils/format.utils';
import { ErrorUtils } from '../utils/errors.utils';

export default class List extends Command {
  static readonly args = {};
  static readonly description = 'Lists the content of a folder id.';
  static readonly aliases = [];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {
    ...CLIUtils.CommonFlags,
    id: Flags.string({
      char: 'f',
      description: 'The folder id to list. Leave empty for the root folder.',
      required: false,
      parse: CLIUtils.parseEmpty,
    }),
    ...ux.table.flags(),
  };
  static readonly enableJsonFlag = true;

  public async run() {
    const { flags } = await this.parse(List);
    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    let folderUuid = await this.getFolderUuid(flags['id'], nonInteractive);
    if (folderUuid.trim().length === 0) {
      // folderId is empty from flags&prompt, which means we should use RootFolderUuid
      folderUuid = userCredentials.user.rootFolderId;
    }

    const { folders, files } = await DriveFolderService.instance.getFolderContent(folderUuid);

    const allItems: PaginatedItem[] = [
      ...folders.map((folder) => {
        return {
          isFolder: true,
          plainName: folder.plainName,
          uuid: folder.uuid,
          type: '',
          size: 0,
          updatedAt: folder.updatedAt,
        };
      }),
      ...files.map((file) => {
        return {
          isFolder: false,
          plainName: file.plainName,
          uuid: file.uuid,
          type: file.type,
          size: Number(file.size),
          updatedAt: file.updatedAt,
        };
      }),
    ];
    ux.table(
      allItems,
      {
        type: {
          header: 'Type',
          get: (row) => (row.isFolder ? 'folder' : 'file'),
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
              return row.isFolder ? '' : FormatUtils.humanFileSize(row.size);
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
    return { success: true, list: allItems };
  }

  async catch(error: Error) {
    ErrorUtils.report(this.error.bind(this), error, { command: this.id });
    CLIUtils.error(this.log.bind(this), error.message);
    this.exit(1);
  }

  public getFolderUuid = async (folderUuidFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    const folderUuid = await CLIUtils.getValueFromFlag(
      {
        value: folderUuidFlag,
        name: List.flags['id'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is the folder id you want to list? (leave empty for the root folder)',
          options: { required: false },
        },
      },
      {
        validate: ValidationService.instance.validateUUIDv4,
        error: new NotValidFolderUuidError(),
        canBeEmpty: true,
      },
      this.log.bind(this),
    );
    return folderUuid;
  };
}
