import { Command, Flags } from '@oclif/core';
import { DriveFileService } from '../services/drive/drive-file.service';
import { CLIUtils } from '../utils/cli.utils';
import { NetworkFacade } from '../services/network/network-facade.service';
import { AuthService } from '../services/auth.service';
import { CryptoService } from '../services/crypto.service';
import { DownloadService } from '../services/network/download.service';
import { UploadService } from '../services/network/upload.service';
import { SdkManager } from '../services/sdk-manager.service';
import { createWriteStream } from 'node:fs';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { DriveFileItem } from '../types/drive.types';
import fs from 'node:fs/promises';
import path from 'node:path';
import { StreamUtils } from '../utils/stream.utils';
import { ErrorUtils } from '../utils/errors.utils';
import { NotValidDirectoryError, NotValidFileUuidError } from '../types/command.types';
import { ValidationService } from '../services/validation.service';

export default class DownloadFile extends Command {
  static readonly args = {};
  static readonly description =
    // eslint-disable-next-line max-len
    'Download and decrypts a file from Internxt Drive to a directory. The file name will be the same as the file name in your Drive.';
  static readonly aliases = ['download:file'];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {
    ...CLIUtils.CommonFlags,
    id: Flags.string({
      char: 'i',
      description: 'The id of the file to download. Use <%= config.bin %> list to view your files ids',
      required: false,
    }),
    directory: Flags.string({
      char: 'd',
      description: 'The directory to download the file to. Leave empty for the current folder.',
      required: false,
      parse: CLIUtils.parseEmpty,
    }),
    overwrite: Flags.boolean({
      char: 'o',
      description: 'Overwrite the file if it already exists',
      default: false,
    }),
  };
  static readonly enableJsonFlag = true;

  public run = async () => {
    const { flags } = await this.parse(DownloadFile);
    const nonInteractive = flags['non-interactive'];
    const overwrite = flags['overwrite'];

    let downloadDirectory = await this.getDirectory(flags['directory'], nonInteractive);
    if (downloadDirectory.trim().length === 0) {
      // downloadDirectory is empty from flags&prompt, which means we should use the current user's folder
      downloadDirectory = '.';
    }

    const fileUuid = await this.getFileUuid(flags['id'], nonInteractive);

    // 1. Get file metadata
    const driveFile = await this.getFileMetadata(fileUuid);

    const downloadPath = await this.getDownloadPath(downloadDirectory, driveFile, overwrite);

    // 2. Prepare the network
    const { user } = await AuthService.instance.getAuthDetails();
    const networkFacade = await this.prepareNetwork(user);
    // 3. Download the file
    const fileWriteStream = createWriteStream(downloadPath);

    const progressBar = CLIUtils.progress({
      format: 'Downloading file [{bar}] {percentage}%',
      linewrap: true,
    });

    progressBar.start(100, 0);
    const [executeDownload, abortable] = await networkFacade.downloadToStream(
      user.bucket,
      user.mnemonic,
      driveFile.fileId,
      driveFile.size,
      StreamUtils.writeStreamToWritableStream(fileWriteStream),
      undefined,
      {
        abortController: new AbortController(),
        progressCallback: (progress) => {
          progressBar.update(progress * 0.99);
        },
      },
    );

    process.on('SIGINT', () => {
      abortable.abort('SIGINT received');
      process.exit(1);
    });

    await executeDownload;

    progressBar.update(100);
    progressBar.stop();
    const message = `File downloaded successfully to ${downloadPath}`;
    CLIUtils.success(this.log.bind(this), message);
    return { success: true, message, file: driveFile };
  };

  public catch = async (error: Error) => {
    ErrorUtils.report(this.error.bind(this), error, { command: this.id });
    CLIUtils.error(this.log.bind(this), error.message);
    this.exit(1);
  };

  private getFileUuid = async (fileUuidFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    const fileUuid = await CLIUtils.getValueFromFlag(
      {
        value: fileUuidFlag,
        name: DownloadFile.flags['id'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is the file id you want to download?',
          options: { type: 'input' },
        },
      },
      {
        validate: ValidationService.instance.validateUUIDv4,
        error: new NotValidFileUuidError(),
      },
      this.log.bind(this),
    );
    return fileUuid;
  };

  private getDirectory = async (directoryFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    const directory = await CLIUtils.getValueFromFlag(
      {
        value: directoryFlag,
        name: DownloadFile.flags['directory'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'Where would you like to download the file? (Enter the local folder path on your computer)',
          options: { type: 'input' },
        },
      },
      {
        validate: ValidationService.instance.validateDirectoryExists,
        error: new NotValidDirectoryError(),
        canBeEmpty: true,
      },
      this.log.bind(this),
    );
    return directory;
  };

  private getFileMetadata = async (uuid: string) => {
    CLIUtils.doing('Getting file metadata');
    const driveFile = await DriveFileService.instance.getFileMetadata(uuid);
    CLIUtils.done();
    if (!driveFile) {
      throw new Error('File not found');
    }
    return driveFile;
  };

  private getDownloadPath = async (downloadDirectory: string, driveFile: DriveFileItem, overwrite: boolean) => {
    const filename = path.format({
      name: driveFile.name,
      ext: `.${driveFile.type}`,
    });

    const downloadPath = path.join(downloadDirectory, filename);

    await fs.access(downloadDirectory, fs.constants.W_OK);

    try {
      const stat = await fs.stat(downloadPath);
      if (stat.isFile() && !overwrite) {
        throw new Error('File already exists, use --overwrite flag to overwrite it');
      }
    } catch (err) {
      // @ts-expect-error - This error contains a code property that we need to check
      if (err.code !== 'ENOENT') {
        throw err;
      }
    }

    return downloadPath;
  };

  private prepareNetwork = async (user: UserSettings) => {
    CLIUtils.doing('Preparing Network');

    const networkModule = SdkManager.instance.getNetwork({
      user: user.bridgeUser,
      pass: user.userId,
    });
    const networkFacade = new NetworkFacade(
      networkModule,
      UploadService.instance,
      DownloadService.instance,
      CryptoService.instance,
    );
    CLIUtils.done();

    return networkFacade;
  };
}
