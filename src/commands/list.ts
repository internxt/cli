import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { CLIUtils } from '../utils/cli.utils';
import { MissingCredentialsError, NotValidFolderUuidError, PaginatedItem } from '../types/command.types';
import { ValidationService } from '../services/validation.service';
import { FormatUtils } from '../utils/format.utils';
import { Header } from 'tty-table';

export default class List extends Command {
  static readonly args = {};
  static readonly description = 'Lists the content of a folder id.';
  static readonly aliases = [];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {
    ...CLIUtils.CommonFlags,
    id: Flags.string({
      char: 'i',
      description: 'The folder id to list. Leave empty for the root folder.',
      required: false,
      parse: CLIUtils.parseEmpty,
    }),
    extended: Flags.boolean({
      char: 'e',
      description: 'Displays additional information in the list.',
      required: false,
    }),
  };
  static readonly enableJsonFlag = true;

  public run = async () => {
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
    const { flags } = await this.parse(List);
    CLIUtils.catchError({
      error,
      command: this.id,
      logReporter: this.log.bind(this),
      errorReporter: this.error.bind(this),
      jsonFlag: flags['json'],
    });
    this.exit(1);
  };

  private getFolderUuid = async (folderUuidFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    const folderUuid = await CLIUtils.getValueFromFlag(
      {
        value: folderUuidFlag,
        name: List.flags['id'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is the folder id you want to list? (leave empty for the root folder)',
          options: { type: 'input' },
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
