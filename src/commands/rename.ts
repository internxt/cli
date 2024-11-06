import { Command, Flags } from '@oclif/core';
import { ConfigService } from '../services/config.service';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { CLIUtils } from '../utils/cli.utils';
import {
  EmptyItemNameError,
  ItemNotFoundError,
  MissingCredentialsError,
  NotValidItemUuidError,
} from '../types/command.types';
import { ValidationService } from '../services/validation.service';
import { DriveFileService } from '../services/drive/drive-file.service';
import { DriveFileItem, DriveFolderItem } from '../types/drive.types';
import { ErrorUtils } from '../utils/errors.utils';

export default class Rename extends Command {
  static readonly args = {};
  static readonly description = 'Rename a folder/file.';

  static readonly examples = ['<%= config.bin %> <%= command.id %>'];

  static readonly flags = {
    ...CLIUtils.CommonFlags,
    id: Flags.string({
      char: 'i',
      description: 'The item id to be renamed (it can be a file id or a folder id).',
      required: false,
    }),
    name: Flags.string({
      char: 'n',
      description: 'The new item name that the item is going to be have.',
      required: false,
    }),
  };

  public async run() {
    const { flags } = await this.parse(Rename);

    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const itemUuid = await this.getItemUuid(flags['id'], nonInteractive);
    const newName = await this.getNewName(flags['name'], nonInteractive);

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
      await DriveFolderService.instance.renameFolder({ folderUuid: item.uuid, name: newName });
    } else {
      await DriveFileService.instance.renameFile(item.uuid, { plainName: newName });
    }
    CLIUtils.success(`${isFolder ? 'Folder' : 'File'} renamed successfully with: ${newName}`);
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
        name: Rename.flags['id'].name,
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

  public getNewName = async (newNameUuidFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    let newName = CLIUtils.getValueFromFlag(
      {
        value: newNameUuidFlag,
        name: Rename.flags['name'].name,
        error: new EmptyItemNameError(),
        canBeEmpty: true,
      },
      nonInteractive,
      (password: string) => password.trim().length > 0,
    );
    if (!newName) {
      newName = (await this.getNewNameInteractively()).trim();
    }
    return newName;
  };

  private static readonly MAX_ATTEMPTS = 3;

  public getItemUuidInteractively = (): Promise<string> => {
    return CLIUtils.promptWithAttempts(
      {
        message: 'What is the item id you want to rename?',
        options: { required: true },
        error: new NotValidItemUuidError(),
      },
      Rename.MAX_ATTEMPTS,
      ValidationService.instance.validateUUIDv4,
    );
  };

  public getNewNameInteractively = (): Promise<string> => {
    return CLIUtils.promptWithAttempts(
      {
        message: 'What is the new name of the item?',
        options: { required: false },
        error: new EmptyItemNameError(),
      },
      Rename.MAX_ATTEMPTS,
      (newName: string) => newName.trim().length > 0,
    );
  };
}
