import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { CLIUtils } from '../utils/cli.utils';
import { MissingCredentialsError, PaginatedItem } from '../types/command.types';
import { FormatUtils } from '../utils/format.utils';
import { TrashService } from '../services/drive/trash.service';
import { Header } from 'tty-table';

export default class TrashList extends Command {
  static readonly args = {};
  static readonly description = 'Lists the content of the trash.';
  static readonly aliases = ['trash:list'];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {
    extended: Flags.boolean({
      char: 'e',
      description: 'Displays additional information in the trash list.',
      required: false,
    }),
  };
  static readonly enableJsonFlag = true;

  public run = async () => {
    const { flags } = await this.parse(TrashList);

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const { folders, files } = await TrashService.instance.getTrashFolderContent();

    const allItems: PaginatedItem[] = [
      ...folders.map((folder) => {
        return {
          type: 'folder',
          name: folder.plainName,
          id: folder.uuid,
          size: '-',
          modified: FormatUtils.formatDate(folder.updatedAt),
        };
      }),
      ...files.map((file) => {
        return {
          type: 'file',
          name: file.type && file.type.length > 0 ? `${file.plainName}.${file.type}` : file.plainName,
          id: file.uuid,
          size: FormatUtils.humanFileSize(Number(file.size)),
          modified: FormatUtils.formatDate(file.updatedAt),
        };
      }),
    ];
    const headers: Header[] = [
      { value: 'type', alias: 'Type' },
      { value: 'name', alias: 'Name' },
      { value: 'id', alias: 'Id' },
    ];
    if (flags.extended) {
      headers.push({ value: 'modified', alias: 'Modified' }, { value: 'size', alias: 'Size' });
    }
    CLIUtils.table(this.log.bind(this), headers, allItems);

    return { success: true, list: { folders, files } };
  };

  public catch = async (error: Error) => {
    const { flags } = await this.parse(TrashList);
    CLIUtils.catchError({
      error,
      command: this.id,
      logReporter: this.log.bind(this),
      errorReporter: this.error.bind(this),
      jsonFlag: flags['json'],
    });
    this.exit(1);
  };
}
