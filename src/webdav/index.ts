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

dotenv.config();

const init = async () => {
  await ConfigService.instance.ensureInternxtCliDataDirExists();
  await ConfigService.instance.ensureWebdavCertsDirExists();
  await ConfigService.instance.ensureInternxtLogsDirExists();

  await DriveDatabaseManager.init();

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
  )
    .start()
    .then()
    .catch(console.error);
};

init();
