import dotenv from 'dotenv';
import { WebDavServer } from './webdav-server';
import express from 'express';
import { ConfigService } from '../services/config.service';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { DriveDatabaseManager } from '../services/database/drive-database-manager.service';
import { DriveFileRepository } from '../services/database/drive-file/drive-file.repository';
import { DriveFolderRepository } from '../services/database/drive-folder/drive-folder.repository';
import { DriveFileService } from '../services/drive/drive-file.service';
import { UploadService } from '../services/network/upload.service';
import { DownloadService } from '../services/network/download.service';
import { AuthService } from '../services/auth.service';
import { CryptoService } from '../services/crypto.service';
import { TrashService } from '../services/drive/trash.service';
import { webdavLogger } from '../utils/logger.utils';
import { SdkManager } from '../services/sdk-manager.service';

dotenv.config();

const init = async () => {
  await ConfigService.instance.ensureInternxtCliDataDirExists();
  await ConfigService.instance.ensureWebdavCertsDirExists();
  await ConfigService.instance.ensureInternxtLogsDirExists();

  await DriveDatabaseManager.init();

  const { token, newToken } = await AuthService.instance.getAuthDetails();
  SdkManager.init({
    token,
    newToken,
  });

  new WebDavServer(
    express(),
    ConfigService.instance,
    DriveFileService.instance,
    DriveFolderService.instance,
    new DriveDatabaseManager(new DriveFileRepository(), new DriveFolderRepository()),
    UploadService.instance,
    DownloadService.instance,
    AuthService.instance,
    CryptoService.instance,
    TrashService.instance,
  )
    .start()
    .then()
    .catch((err) => webdavLogger.error('Failed to start WebDAV server', err));
};

process.on('uncaughtException', (err) => {
  webdavLogger.error('Unhandled exception:', err);
});

init();
