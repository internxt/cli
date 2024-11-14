import { Command, Flags, ux } from '@oclif/core';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { NetworkFacade } from '../services/network/network-facade.service';
import { SdkManager } from '../services/sdk-manager.service';
import { AuthService } from '../services/auth.service';
import { CLIUtils } from '../utils/cli.utils';
import { ConfigService } from '../services/config.service';
import path from 'node:path';
import { DriveFileService } from '../services/drive/drive-file.service';
import { UploadService } from '../services/network/upload.service';
import { CryptoService } from '../services/crypto.service';
import { DownloadService } from '../services/network/download.service';
import { ErrorUtils } from '../utils/errors.utils';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { MissingCredentialsError, NotValidDirectoryError, NotValidFolderUuidError } from '../types/command.types';
import { ValidationService } from '../services/validation.service';

export default class UploadFile extends Command {
  static readonly args = {};
  static readonly description = 'Upload a file to Internxt Drive';
  static readonly aliases = [];
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

  public async run() {
    const { flags } = await this.parse(UploadFile);

    const nonInteractive = flags['non-interactive'];

    const userCredentials = await ConfigService.instance.readUser();
    if (!userCredentials) throw new MissingCredentialsError();

    const filePath = await this.getFilePath(flags['file'], nonInteractive);

    const stat = await fs.stat(filePath);
    if (!stat.size) {
      throw new Error('The file is empty. Uploading empty files is not allowed.');
    }

    let destinationFolderUuid = await this.getDestinationFolderUuid(flags['destination'], nonInteractive);
    if (destinationFolderUuid.trim().length === 0) {
      // destinationFolderUuid is empty from flags&prompt, which means we should use RootFolderUuid
      destinationFolderUuid = userCredentials.user.rootFolderId;
    }

    const folderId = (await DriveFolderService.instance.getFolderMetaByUuid(destinationFolderUuid)).id;

    // 1. Prepare the network
    CLIUtils.doing('Preparing Network');
    const { mnemonic } = await AuthService.instance.getAuthDetails();
    const user = await AuthService.instance.getUser();
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

    const timer = CLIUtils.timer();
    // 2. Upload file to the Network
    const fileStream = createReadStream(filePath);
    const progressBar = ux.progress({
      format: 'Uploading file [{bar}] {percentage}%',
      linewrap: true,
    });
    progressBar.start(1, 0);
    const [uploadPromise, abortable] = await networkFacade.uploadFromStream(
      user.bucket,
      mnemonic,
      stat.size,
      fileStream,
      {
        progressCallback: (progress) => {
          progressBar.update(progress);
        },
      },
    );

    process.on('SIGINT', () => {
      abortable.abort('SIGINT received');
      process.exit(1);
    });

    const uploadResult = await uploadPromise;
    progressBar.stop();

    // 3. Create the file in Drive
    const fileInfo = path.parse(filePath);
    const createdDriveFile = await DriveFileService.instance.createFile({
      name: fileInfo.name,
      type: fileInfo.ext.replaceAll('.', ''),
      size: stat.size,
      folderId: folderId,
      fileId: uploadResult.fileId,
      bucket: user.bucket,
    });

    const uploadTime = timer.stop();
    this.log('\n');
    const message = `File uploaded in ${uploadTime}ms, view it at ${ConfigService.instance.get('DRIVE_URL')}/file/${createdDriveFile.uuid}`;
    CLIUtils.success(this.log.bind(this), message);
    return { success: true, message, file: createdDriveFile };
  }

  async catch(error: Error) {
    ErrorUtils.report(this.error.bind(this), error, { command: this.id });
    CLIUtils.error(this.log.bind(this), error.message);
    this.exit(1);
  }

  public getDestinationFolderUuid = async (
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
          options: { required: false },
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
          options: { required: false },
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
