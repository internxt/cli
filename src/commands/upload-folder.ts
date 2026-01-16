import { Command, Flags } from '@oclif/core';
import { CLIUtils } from '../utils/cli.utils';
import { AuthService } from '../services/auth.service';
import { ValidationService } from '../services/validation.service';
import { ConfigService } from '../services/config.service';
import { UploadFacade } from '../services/network/upload/upload-facade.service';
import { NotValidDirectoryError } from '../types/command.types';

export default class UploadFolder extends Command {
  static readonly args = {};
  static readonly description = 'Upload a folder to Internxt Drive';
  static readonly aliases = ['upload:folder'];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {
    ...CLIUtils.CommonFlags,
    folder: Flags.string({
      char: 'f',
      description: 'The path to the folder on your system.',
      required: false,
    }),
    destination: Flags.string({
      char: 'i',
      description: 'The folder id where the folder is going to be uploaded to. Leave empty for the root folder.',
      required: false,
      parse: CLIUtils.parseEmpty,
    }),
  };
  static readonly enableJsonFlag = true;

  public run = async () => {
    const userCredentials = await AuthService.instance.getAuthDetails();
    const user = userCredentials.user;

    const { flags } = await this.parse(UploadFolder);
    const localPath = await this.getFolderPath(flags['folder'], flags['non-interactive']);

    const destinationFolderUuidFromFlag = await CLIUtils.getDestinationFolderUuid({
      destinationFolderUuidFlag: flags['destination'],
      destinationFlagName: UploadFolder.flags['destination'].name,
      nonInteractive: flags['non-interactive'],
      reporter: this.log.bind(this),
    });
    const destinationFolderUuid = await CLIUtils.getRootFolderIdIfEmpty(destinationFolderUuidFromFlag, userCredentials);

    const progressBar = CLIUtils.progress(
      {
        format: 'Uploading folder [{bar}] {percentage}%',
        linewrap: true,
      },
      flags['json'],
    );
    progressBar?.start(100, 0);
    const data = await UploadFacade.instance.uploadFolder({
      localPath,
      destinationFolderUuid,
      loginUserDetails: user,
      jsonFlag: flags['json'],
      onProgress: (progress) => {
        progressBar?.update(progress.percentage);
      },
    });

    progressBar?.update(100);
    progressBar?.stop();

    const driveUrl = ConfigService.instance.get('DRIVE_WEB_URL');
    const folderUrl = `${driveUrl}/folder/${data.rootFolderId}`;
    const message = `Folder uploaded in ${data.uploadTimeMs}ms, view it at ${folderUrl} (${data.totalBytes} bytes)`;
    CLIUtils.success(this.log.bind(this), message);
  };

  public catch = async (error: Error) => {
    const { flags } = await this.parse(UploadFolder);
    CLIUtils.catchError({
      error,
      command: this.id,
      logReporter: this.log.bind(this),
      jsonFlag: flags['json'],
    });
    this.exit(1);
  };

  private getFolderPath = async (folderFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    return await CLIUtils.getValueFromFlag(
      {
        value: folderFlag,
        name: UploadFolder.flags['folder'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is the path to the folder on your computer?',
          options: { type: 'input' },
        },
      },
      {
        validate: ValidationService.instance.validateDirectoryExists,
        error: new NotValidDirectoryError(),
      },
      this.log.bind(this),
    );
  };
}
