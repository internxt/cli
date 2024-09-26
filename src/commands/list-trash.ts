import { Command, ux } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { MissingCredentialsError, PaginatedItem } from '../types/command.types';
import { FormatUtils } from '../utils/format.utils';
import { ErrorUtils } from '../utils/errors.utils';
import { TrashService } from '../services/drive/trash.service';

export default class ListTrash extends Command {
  static readonly args = {};
  static readonly description = 'Lists the content of the trash.';

  static readonly examples = ['<%= config.bin %> <%= command.id %>'];

  static readonly flags = {
    ...CLIUtils.CommonFlags,
    ...ux.table.flags(),
  };

  public async run() {
    const { flags } = await this.parse(ListTrash);

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const { folders, files } = await TrashService.instance.getTrashFolderContent();

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
    ErrorUtils.report(error, { command: this.id });
    CLIUtils.error(error.message);
    this.exit(1);
  }
}
