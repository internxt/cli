import { Command, Flags } from '@oclif/core';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { NetworkFacade } from '../services/network/network-facade.service';
import { SdkManager } from '../services/sdk-manager.service';
import { AuthService } from '../services/auth.service';
import { CLIUtils } from '../utils/cli.utils';
import { ConfigService } from '../services/config.service';
import path from 'node:path';
import { DriveFileService } from '../services/drive/drive-file.service';
import { CryptoService } from '../services/crypto.service';
import { DownloadService } from '../services/network/download.service';
import { ErrorUtils } from '../utils/errors.utils';
import { NotValidDirectoryError, NotValidFolderUuidError } from '../types/command.types';
import { ValidationService } from '../services/validation.service';
import { EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import { ThumbnailService } from '../services/thumbnail.service';
import { BufferStream } from '../utils/stream.utils';
import { isFileThumbnailable } from '../utils/thumbnail.utils';
import { Readable } from 'node:stream';
import { Environment } from '@internxt/inxt-js';

export default class UploadFile extends Command {
  static readonly args = {};
  static readonly description = 'Upload a file to Internxt Drive';
  static readonly aliases = ['upload:file'];
  static readonly examples = ['<%= config.bin %> <%= command.id %>'];
  static readonly flags = {
    ...CLIUtils.CommonFlags,
    file: Flags.string({
      char: 'f',
      description: 'The path to the file on your system.',
      required: false,
    }),
    destination: Flags.string({
      char: 'i',
      description: 'The folder id where the file is going to be uploaded to. Leave empty for the root folder.',
      required: false,
      parse: CLIUtils.parseEmpty,
    }),
  };
  static readonly enableJsonFlag = true;

  public run = async () => {
    const { flags } = await this.parse(UploadFile);

    const nonInteractive = flags['non-interactive'];

    const { user } = await AuthService.instance.getAuthDetails();

    const filePath = await this.getFilePath(flags['file'], nonInteractive);

    const stats = await stat(filePath);
    if (!stats.size) {
      throw new Error('The file is empty. Uploading empty files is not allowed.');
    }

    const fileInfo = path.parse(filePath);
    const fileType = fileInfo.ext.replaceAll('.', '');

    let destinationFolderUuid = await this.getDestinationFolderUuid(flags['destination'], nonInteractive);
    if (destinationFolderUuid.trim().length === 0) {
      // destinationFolderUuid is empty from flags&prompt, which means we should use RootFolderUuid
      destinationFolderUuid = user.rootFolderId;
    }

    // 1. Prepare the network
    CLIUtils.doing('Preparing Network', flags['json']);
    const networkModule = SdkManager.instance.getNetwork({
      user: user.bridgeUser,
      pass: user.userId,
    });
    const environment = new Environment({
      bridgeUser: user.bridgeUser,
      bridgePass: user.userId,
      bridgeUrl: ConfigService.instance.get('NETWORK_URL'),
      encryptionKey: user.mnemonic,
      appDetails: SdkManager.getAppDetails(),
    });
    const networkFacade = new NetworkFacade(
      networkModule,
      environment,
      DownloadService.instance,
      CryptoService.instance,
    );

    CLIUtils.done(flags['json']);

    // 2. Upload file to the Network
    const readStream = createReadStream(filePath);
    const timer = CLIUtils.timer();
    const progressBar = CLIUtils.progress(
      {
        format: 'Uploading file [{bar}] {percentage}%',
        linewrap: true,
      },
      flags['json'],
    );
    progressBar?.start(100, 0);

    let bufferStream: BufferStream | undefined;
    let fileStream: Readable = readStream;
    const isThumbnailable = isFileThumbnailable(fileType);
    if (isThumbnailable) {
      bufferStream = new BufferStream();
      fileStream = readStream.pipe(bufferStream);
    }

    const progressCallback = (progress: number) => {
      progressBar?.update(progress * 100 * 0.99);
    };

    const fileId = await new Promise((resolve: (fileId: string) => void, reject) => {
      const state = networkFacade.uploadFile(
        fileStream,
        stats.size,
        user.bucket,
        (err: Error | null, res: string | null) => {
          if (err) {
            return reject(err);
          }
          resolve(res as string);
        },
        progressCallback,
      );
      process.on('SIGINT', () => {
        state.stop();
        process.exit(1);
      });
    });

    // 3. Create the file in Drive
    const createdDriveFile = await DriveFileService.instance.createFile({
      plainName: fileInfo.name,
      type: fileType,
      size: stats.size,
      folderUuid: destinationFolderUuid,
      fileId: fileId,
      bucket: user.bucket,
      encryptVersion: EncryptionVersion.Aes03,
      creationTime: stats.birthtime?.toISOString(),
      modificationTime: stats.mtime?.toISOString(),
    });

    try {
      if (isThumbnailable && bufferStream) {
        const thumbnailBuffer = bufferStream.getBuffer();

        if (thumbnailBuffer) {
          await ThumbnailService.instance.uploadThumbnail(
            thumbnailBuffer,
            fileType,
            user.bucket,
            createdDriveFile.uuid,
            networkFacade,
          );
        }
      }
    } catch (error) {
      ErrorUtils.report(error, { command: this.id });
    }

    progressBar?.update(100);
    progressBar?.stop();

    const uploadTime = timer.stop();
    this.log('\n');
    // eslint-disable-next-line max-len
    const message = `File uploaded in ${uploadTime}ms, view it at ${ConfigService.instance.get('DRIVE_WEB_URL')}/file/${createdDriveFile.uuid}`;
    CLIUtils.success(this.log.bind(this), message);
    return {
      success: true,
      message,
      file: {
        ...createdDriveFile,
        plainName: fileInfo.name,
      },
    };
  };

  public catch = async (error: Error) => {
    const { flags } = await this.parse(UploadFile);
    CLIUtils.catchError({
      error,
      command: this.id,
      logReporter: this.log.bind(this),
      jsonFlag: flags['json'],
    });
    this.exit(1);
  };

  private getDestinationFolderUuid = async (
    destinationFolderUuidFlag: string | undefined,
    nonInteractive: boolean,
  ): Promise<string> => {
    const destinationFolderUuid = await CLIUtils.getValueFromFlag(
      {
        value: destinationFolderUuidFlag,
        name: UploadFile.flags['destination'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is the destination folder id? (leave empty for the root folder)',
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
    return destinationFolderUuid;
  };

  private getFilePath = async (fileFlag: string | undefined, nonInteractive: boolean): Promise<string> => {
    const filePath = await CLIUtils.getValueFromFlag(
      {
        value: fileFlag,
        name: UploadFile.flags['file'].name,
      },
      {
        nonInteractive,
        prompt: {
          message: 'What is the path to the file on your computer?',
          options: { type: 'input' },
        },
      },
      {
        validate: ValidationService.instance.validateFileExists,
        error: new NotValidDirectoryError(),
      },
      this.log.bind(this),
    );
    return filePath;
  };
}
