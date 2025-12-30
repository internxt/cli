import { Command, Flags } from '@oclif/core';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { AuthService } from '../services/auth.service';
import { CLIUtils } from '../utils/cli.utils';
import { ConfigService } from '../services/config.service';
import path from 'node:path';
import { DriveFileService } from '../services/drive/drive-file.service';
import { ErrorUtils } from '../utils/errors.utils';
import { NotValidDirectoryError } from '../types/command.types';
import { ValidationService } from '../services/validation.service';
import { EncryptionVersion } from '@internxt/sdk/dist/drive/storage/types';
import { ThumbnailService } from '../services/thumbnail.service';
import { BufferStream } from '../utils/stream.utils';
import { isFileThumbnailable } from '../utils/thumbnail.utils';
import { Readable } from 'node:stream';

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

    // If destinationFolderUuid is empty from flags&prompt, means we should use RootFolderUuid
    const destinationFolderUuid =
      (await CLIUtils.getDestinationFolderUuid({
        destinationFolderUuidFlag: flags['destination'],
        destinationFlagName: UploadFile.flags['destination'].name,
        nonInteractive,
        reporter: this.log.bind(this),
      })) ?? user.rootFolderId;

    const timings = {
      networkUpload: 0,
      driveUpload: 0,
      thumbnailUpload: 0,
    };

    // 1. Prepare the network
    const networkFacade = await CLIUtils.prepareNetwork({ loginUserDetails: user, jsonFlag: flags['json'] });

    // 2. Upload file to the Network
    const readStream = createReadStream(filePath);
    const networkUploadTimer = CLIUtils.timer();
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
    timings.networkUpload = networkUploadTimer.stop();

    // 3. Create the file in Drive
    const driveUploadTimer = CLIUtils.timer();
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
    timings.driveUpload = driveUploadTimer.stop();

    const thumbnailTimer = CLIUtils.timer();
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
    timings.thumbnailUpload = thumbnailTimer.stop();

    progressBar?.update(100);
    progressBar?.stop();

    const totalTime = Object.values(timings).reduce((sum, time) => sum + time, 0);
    const throughputMBps = CLIUtils.calculateThroughputMBps(stats.size, timings.networkUpload);

    this.log('\n');
    this.log(
      `[PUT] Timing breakdown:\n
      Network upload: ${CLIUtils.formatDuration(timings.networkUpload)} (${throughputMBps.toFixed(2)} MB/s)\n
      Drive upload: ${CLIUtils.formatDuration(timings.driveUpload)}\n
      Thumbnail: ${CLIUtils.formatDuration(timings.thumbnailUpload)}\n`,
    );
    this.log('\n');
    // eslint-disable-next-line max-len
    const message = `File uploaded successfully in ${CLIUtils.formatDuration(totalTime)}, view it at ${ConfigService.instance.get('DRIVE_WEB_URL')}/file/${createdDriveFile.uuid}`;
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
