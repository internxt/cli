import dotenv from 'dotenv';
import { WebDavServer } from './webdav-server';
import express from 'express';
import { Realm } from 'realm';
import { ConfigService } from '../services/config.service';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { DriveRealmManager } from '../services/realms/drive-realm-manager.service';
import { DriveFilesRealm, DriveFileRealmSchema } from '../services/realms/drive-files.realm';
import { DriveFoldersRealm, DriveFolderRealmSchema } from '../services/realms/drive-folders.realm';
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
  const realm = await Realm.open({
    path: ConfigService.DRIVE_REALM_FILE,
    schema: [DriveFileRealmSchema, DriveFolderRealmSchema],
    deleteRealmIfMigrationNeeded: true,
  });

  new WebDavServer(
    express(),
    ConfigService.instance,
    DriveFileService.instance,
    DriveFolderService.instance,
    new DriveRealmManager(new DriveFilesRealm(realm), new DriveFoldersRealm(realm)),
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
