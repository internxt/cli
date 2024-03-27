import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { CLIUtils } from '../utils/cli.utils';
import { ItemNotFoundError, MissingCredentialsError, NotValidItemUuidError } from '../types/command.types';
import { ValidationService } from '../services/validation.service';
import { DriveFileService } from '../services/drive/drive-file.service';
import { DriveFileItem, DriveFolderItem } from '../types/drive.types';
import { ErrorUtils } from '../utils/errors.utils';
import { TrashService } from '../services/drive/trash.service';

export default class Trash extends Command {
  static readonly args = {};
  static readonly description = 'Moves a given folder/file to the trash.';

  static readonly examples = ['<%= config.bin %> <%= command.id %>'];

  static readonly flags = {
    ...CLIUtils.CommonFlags,
    id: Flags.string({
      char: 'i',
      description: 'The item id to be trashed (it can be a file id or a folder id).',
      required: false,
    }),
  };

  public async run() {
    const { flags } = await this.parse(Trash);

    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const itemUuid = await this.getItemUuid(flags['id'], nonInteractive);

    let item: DriveFileItem | DriveFolderItem | undefined;
    let isFolder = false;
    try {
      if (!item) {
        item = await DriveFileService.instance.getFileMetadata(itemUuid);
        isFolder = false;
      }
    } catch {
      /* noop */
    }
    try {
      if (!item) {
        item = await DriveFolderService.instance.getFolderMetaByUuid(itemUuid);
        isFolder = true;
      }
    } catch {
      /* noop */
    }

    if (!item) throw new ItemNotFoundError();

    if (isFolder) {
      await TrashService.instance.trashItems({ items: [{ uuid: item.uuid, type: 'folder' }] });
    } else {
      await TrashService.instance.trashItems({ items: [{ uuid: item.uuid, type: 'file' }] });
    }
    CLIUtils.success(
      `${isFolder ? 'Folder' : 'File'} trashed successfully, you can restore or delete it permanently on: https://drive.internxt.com/trash`,
    );
  }

  async catch(error: Error) {
    ErrorUtils.report(error, { command: this.id });
    CLIUtils.error(error.message);
    this.exit(1);
  }

  public getItemUuid = async (itemUuidFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    let itemUuid = CLIUtils.getValueFromFlag(
      {
        value: itemUuidFlag,
        name: Trash.flags['id'].name,
        error: new NotValidItemUuidError(),
        canBeEmpty: true,
      },
      nonInteractive,
      (itemUuid: string) => ValidationService.instance.validateUUIDv4(itemUuid),
    );
    if (!itemUuid) {
      itemUuid = (await this.getItemUuidInteractively()).trim();
    }
    return itemUuid;
  };

  private static readonly MAX_ATTEMPTS = 3;

  public getItemUuidInteractively = (): Promise<string> => {
    return CLIUtils.promptWithAttempts(
      {
        message: 'What is the item id you want to trash?',
        options: { required: true },
        error: new NotValidItemUuidError(),
      },
      Trash.MAX_ATTEMPTS,
      ValidationService.instance.validateUUIDv4,
    );
  };
}
