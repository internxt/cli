import dotenv from 'dotenv';
import { WebDavServer } from './webdav-server';
import express from 'express';
import { ConfigService } from '../services/config.service';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { DriveFileService } from '../services/drive/drive-file.service';
import { DownloadService } from '../services/network/download.service';
import { AuthService } from '../services/auth.service';
import { CryptoService } from '../services/crypto.service';
import { TrashService } from '../services/drive/trash.service';
import { webdavLogger } from '../utils/logger.utils';
import { SdkManager } from '../services/sdk-manager.service';

dotenv.config({ quiet: true });

const init = async () => {
  await ConfigService.instance.ensureInternxtCliDataDirExists();
  await ConfigService.instance.ensureWebdavCertsDirExists();
  await ConfigService.instance.ensureInternxtLogsDirExists();

  const { token, workspace } = await AuthService.instance.getAuthDetails();
  SdkManager.init({ token, workspaceToken: workspace?.workspaceCredentials.token });

  new WebDavServer(
    express(),
    ConfigService.instance,
    DriveFileService.instance,
    DriveFolderService.instance,
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
