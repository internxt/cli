import { Command, Flags, ux } from '@oclif/core';
import { DriveFileService } from '../services/drive/drive-file.service';
import { CLIUtils } from '../utils/cli.utils';
import { NetworkFacade } from '../services/network/network-facade.service';
import { AuthService } from '../services/auth.service';
import { CryptoService } from '../services/crypto.service';
import { DownloadService } from '../services/network/download.service';
import { UploadService } from '../services/network/upload.service';
import { SdkManager } from '../services/sdk-manager.service';
import { createWriteStream } from 'fs';
import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import { DriveFileItem } from '../types/drive.types';
import fs from 'fs/promises';
import path from 'path';
import { StreamUtils } from '../utils/stream.utils';

export default class Download extends Command {
  static description =
    'Download and decrypts a file from Internxt Drive to a directory. The file name will be the same as the file name in your Drive';

  static examples = ['<%= config.bin %> <%= command.id %>'];

  static flags = {
    overwrite: Flags.boolean({ description: 'Overwrite the file if it already exists', default: false }),
    id: Flags.string({
      description: 'The id of the file to download. Use <%= config.bin %> list to view your files ids',
      required: true,
    }),
    directory: Flags.string({
      description: 'The directory to download the file to.',
      required: true,
    }),
  };

  async catch(error: Error) {
    CLIUtils.error(error.message);
    this.exit(1);
  }

  public getFileMetadata = async (uuid: string) => {
    CLIUtils.doing('Getting file metadata');
    const driveFile = await DriveFileService.instance.getFileMetadata(uuid);
    CLIUtils.done();

    if (!driveFile) {
      throw new Error('File not found');
    }

    return driveFile;
  };

  public getUser = async (): Promise<UserSettings> => {
    const { mnemonic } = await AuthService.instance.getAuthDetails();
    const user = await AuthService.instance.getUser();

    return {
      ...user,
      mnemonic,
    };
  };

  public getDownloadPath = async (downloadDirectory: string, driveFile: DriveFileItem, overwrite: boolean) => {
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

  public prepareNetwork = async (user: UserSettings) => {
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

  public async run(): Promise<void> {
    const { flags } = await this.parse(Download);
    const { directory: downloadDirectory, uuid: fileUuid, overwrite } = flags;

    const directoryStat = await fs.stat(downloadDirectory);

    if (!directoryStat.isDirectory()) {
      throw new Error('The directory provided is not a directory');
    }

    // 1. Get file metadata
    const driveFile = await this.getFileMetadata(fileUuid);

    const downloadPath = await this.getDownloadPath(downloadDirectory, driveFile, overwrite);

    // 2. Prepare the network
    const user = await this.getUser();
    const networkFacade = await this.prepareNetwork(user);
    // 3. Download the file
    const fileWriteStream = createWriteStream(downloadPath);

    const progressBar = ux.progress({
      format: 'Downloading file [{bar}] {percentage}%',
      linewrap: true,
    });

    progressBar.start(100, 0);
    const [executeDownload, abortable] = await networkFacade.downloadToStream(
      user.bucket,
      user.mnemonic,
      driveFile.fileId,
      StreamUtils.writeStreamToWritableStream(fileWriteStream),
      {
        abortController: new AbortController(),
        progressCallback: (progress) => {
          progressBar.update(progress);
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
    CLIUtils.success(`File downloaded successfully to ${downloadPath}`);
  }
}
