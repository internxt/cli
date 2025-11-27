import { Command, Flags } from '@oclif/core';
import { CLIUtils } from '../utils/cli.utils';
import { AuthService } from '../services/auth.service';
import { ValidationService } from '../services/validation.service';
import { ConfigService } from '../services/config.service';
import { UploadFacade } from '../services/network/upload/upload-facade.service';

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
      required: true,
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
    const { user } = await AuthService.instance.getAuthDetails();
    const { flags } = await this.parse(UploadFolder);
    const doesDirectoryExist = await ValidationService.instance.validateDirectoryExists(flags['folder']);
    if (!doesDirectoryExist) {
      throw new Error(`The provided folder path is not a valid directory: ${flags['folder']}`);
    }

    // If destinationFolderUuid is empty from flags&prompt, means we should use RootFolderUuid
    const destinationFolderUuid =
      (await CLIUtils.getDestinationFolderUuid({
        destinationFolderUuidFlag: flags['destination'],
        destinationFlagName: UploadFolder.flags['destination'].name,
        nonInteractive: flags['non-interactive'],
        reporter: this.log.bind(this),
      })) ?? user.rootFolderId;

    const progressBar = CLIUtils.progress(
      {
        format: 'Uploading folder [{bar}] {percentage}%',
        linewrap: true,
      },
      flags['json'],
    );
    progressBar?.start(100, 0);
    const { data, error } = await UploadFacade.instance.uploadFolder({
      localPath: flags['folder'],
      destinationFolderUuid,
      loginUserDetails: user,
      jsonFlag: flags['json'],
      onProgress: (progress) => {
        progressBar?.update(progress.percentage);
      },
    });

    progressBar?.update(100);
    progressBar?.stop();

    if (error) {
      throw error;
    }

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
}
