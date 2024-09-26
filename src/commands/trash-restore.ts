import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { CLIUtils } from '../utils/cli.utils';
import {
  ItemNotFoundError,
  MissingCredentialsError,
  NotValidFolderUuidError,
  NotValidItemUuidError,
} from '../types/command.types';
import { ValidationService } from '../services/validation.service';
import { DriveFileService } from '../services/drive/drive-file.service';
import { DriveFileItem, DriveFolderItem } from '../types/drive.types';
import { ErrorUtils } from '../utils/errors.utils';

export default class TrashRestore extends Command {
  static readonly args = {};
  static readonly description = 'Restore a trashed folder/file into a destination folder.';
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly aliases = ['trash:restore', 'trash:move'];
  static readonly flags = {
    ...CLIUtils.CommonFlags,
    id: Flags.string({
      char: 'i',
      description: 'The item id to be restored from the trash (it can be a file id or a folder id).',
      required: false,
    }),
    destination: Flags.string({
      char: 'd',
      description: 'The destination folder id where the item is going to be restored.',
      required: false,
    }),
  };

  public async run() {
    const { flags } = await this.parse(TrashRestore);

    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const itemUuid = await this.getItemUuid(flags['id'], nonInteractive);
    const destinationFolderUuid = await this.getDestinationFolderUuid(flags['destination'], nonInteractive);

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
      await DriveFolderService.instance.moveFolder({ folderUuid: item.uuid, destinationFolderUuid });
    } else {
      await DriveFileService.instance.moveFile({ fileUuid: item.uuid, destinationFolderUuid });
    }
    CLIUtils.success(`${isFolder ? 'Folder' : 'File'} restored successfully to: ${destinationFolderUuid}`);
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
        name: TrashRestore.flags['id'].name,
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

  public getDestinationFolderUuid = async (
    destinationFolderUuidFlag: string | undefined,
    nonInteractive: boolean,
  ): Promise<string> => {
    let destinationFolderUuid = CLIUtils.getValueFromFlag(
      {
        value: destinationFolderUuidFlag,
        name: TrashRestore.flags['destination'].name,
        error: new NotValidFolderUuidError(),
        canBeEmpty: true,
      },
      nonInteractive,
      (folderUuid: string) => ValidationService.instance.validateUUIDv4(folderUuid),
    );
    if (!destinationFolderUuid) {
      destinationFolderUuid = (await this.getDestinationFolderUuidInteractively()).trim();
    }
    return destinationFolderUuid;
  };

  private static readonly MAX_ATTEMPTS = 3;

  public getItemUuidInteractively = (): Promise<string> => {
    return CLIUtils.promptWithAttempts(
      {
        message: 'What is the item id you want to restore?',
        options: { required: true },
        error: new NotValidItemUuidError(),
      },
      TrashRestore.MAX_ATTEMPTS,
      ValidationService.instance.validateUUIDv4,
    );
  };

  public getDestinationFolderUuidInteractively = (): Promise<string> => {
    return CLIUtils.promptWithAttempts(
      {
        message: 'What is the destination folder id?',
        options: { required: true },
        error: new NotValidFolderUuidError(),
      },
      TrashRestore.MAX_ATTEMPTS,
      ValidationService.instance.validateUUIDv4,
    );
  };
}
