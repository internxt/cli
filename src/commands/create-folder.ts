import { Command, Flags } from '@oclif/core';
import { CLIUtils } from '../utils/cli.utils';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { ConfigService } from '../services/config.service';
import { ValidationService } from '../services/validation.service';
import { EmptyFolderNameError, MissingCredentialsError, NotValidFolderUuidError } from '../types/command.types';
import { AsyncUtils } from '../utils/async.utils';

export default class CreateFolder extends Command {
  static readonly args = {};
  static readonly description = 'Create a folder in your Internxt Drive';
  static readonly aliases = [];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {
    ...CLIUtils.CommonFlags,
    name: Flags.string({
      char: 'n',
      description: 'The new name for the folder',
      required: false,
    }),
    id: Flags.string({
      char: 'i',
      description:
        'The ID of the folder where the new folder will be created. Defaults to your root folder if not specified.',
      required: false,
      parse: CLIUtils.parseEmpty,
    }),
  };
  static readonly enableJsonFlag = true;

  public run = async () => {
    const { flags } = await this.parse(CreateFolder);
    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const folderName = await this.getFolderName(flags['name'], nonInteractive);

    const folderUuidFromFlag = await this.getFolderUuid(flags['id'], nonInteractive);
    const folderUuid = await CLIUtils.getRootFolderIdIfEmpty(folderUuidFromFlag, userCredentials);

    CLIUtils.doing('Creating folder...', flags['json']);
    const [createNewFolder, requestCanceler] = DriveFolderService.instance.createFolder({
      plainName: folderName,
      parentFolderUuid: folderUuid,
    });

    process.on('SIGINT', () => {
      requestCanceler.cancel('SIGINT received');
      process.exit(1);
    });

    const newFolder = await createNewFolder;
    // This aims to prevent this issue: https://inxt.atlassian.net/browse/PB-1446
    await AsyncUtils.sleep(500);

    CLIUtils.done(flags['json']);
    // eslint-disable-next-line max-len
    const message = `Folder ${newFolder.plainName} created successfully, view it at ${ConfigService.instance.get('DRIVE_WEB_URL')}/folder/${newFolder.uuid}`;
    CLIUtils.success(this.log.bind(this), message);
    return { success: true, message, folder: newFolder };
  };

  public catch = async (error: Error) => {
    const { flags } = await this.parse(CreateFolder);
    CLIUtils.catchError({
      error,
      command: this.id,
      logReporter: this.log.bind(this),
      jsonFlag: flags['json'],
    });
    this.exit(1);
  };

  private getFolderName = async (folderNameFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    const folderName = await CLIUtils.getValueFromFlag(
      {
        value: folderNameFlag,
        name: CreateFolder.flags['name'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What would you like to name the new folder?',
          options: { type: 'input' },
        },
      },
      {
        validate: ValidationService.instance.validateStringIsNotEmpty,
        error: new EmptyFolderNameError(),
      },
      this.log.bind(this),
    );
    return folderName;
  };

  private getFolderUuid = async (folderUuidFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    const folderUuid = await CLIUtils.getValueFromFlag(
      {
        value: folderUuidFlag,
        name: CreateFolder.flags['id'].name,
      },
      {
        nonInteractive,
        prompt: {
          message:
            // eslint-disable-next-line max-len
            'What is the ID of the folder where you would like to create the new folder? (leave empty for the root folder)',
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
