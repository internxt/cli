import dotenv from 'dotenv';
import { WebDavServer } from './webdav-server';
import express from 'express';
import { Realm } from 'realm';
import { ConfigService } from '../services/config.service';
import { DriveFolderService } from '../services/drive/drive-folder.service';
import { DriveRealmManager } from '../services/realms/drive-realm-manager.service';
import { DriveFilesRealm, DriveFileRealmSchema } from '../services/realms/drive-files.realm';
import { DriveFoldersRealm, DriveFolderRealmSchema } from '../services/realms/drive-folders.realm';

dotenv.config();

const init = async () => {
  await ConfigService.instance.ensureInternxtCliDataDirExists();
  const realm = await Realm.open({
    path: ConfigService.DRIVE_REALM_FILE,
    schema: [DriveFileRealmSchema, DriveFolderRealmSchema],
  });
  new WebDavServer(
    express(),
    ConfigService.instance,
    DriveFolderService.instance,
    new DriveRealmManager(new DriveFilesRealm(realm), new DriveFoldersRealm(realm)),
  )
    .start()
    .then()
    .catch(console.error);
};

init();
