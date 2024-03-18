import sinon from 'sinon';
import { DriveFileRealmSchema, DriveFilesRealm } from '../../src/services/realms/drive-files.realm';
import { DriveFolderRealmSchema, DriveFoldersRealm } from '../../src/services/realms/drive-folders.realm';
import { DriveRealmManager } from '../../src/services/realms/drive-realm-manager.service';

export const getDriveFileRealmSchemaFixture = (payload: Partial<DriveFileRealmSchema> = {}): DriveFileRealmSchema => {
  // @ts-expect-error - We only mock the properties we need
  const object: DriveFileRealmSchema = {
    id: new Date().getTime(),
    name: `file_${new Date().getTime().toString()}`,
    uuid: `uuid_${new Date().getTime().toString()}`,
    relative_path: '',
    created_at: new Date(),
    updated_at: new Date(),
    status: 'EXISTS',
    file_id: `file_id_${new Date().getTime().toString()}`,
    folder_id: 0,
    bucket: new Date().getTime().toString(),
    size: 0,
  };

  // @ts-expect-error - We only mock the properties we need
  return {
    ...object,
    ...payload,
  };
};

export const getDriveFolderRealmSchemaFixture = (
  payload: Partial<DriveFolderRealmSchema> = {},
): DriveFolderRealmSchema => {
  // @ts-expect-error - We only mock the properties we need
  const object: DriveFolderRealmSchema = {
    id: new Date().getTime(),
    name: `folder_${new Date().getTime().toString()}`,
    uuid: `uuid_${new Date().getTime().toString()}`,
    relative_path: '',
    created_at: new Date(),
    updated_at: new Date(),
    status: 'EXISTS',
  };

  // @ts-expect-error - We only mock the properties we need
  return {
    ...object,
    ...payload,
  };
};

export const getDriveRealmManager = (): DriveRealmManager => {
  // @ts-expect-error - We only mock the properties we need
  const driveFilesRealm: DriveFilesRealm = {
    findByRelativePath: sinon.stub(),
  };

  // @ts-expect-error - We only mock the properties we need
  const driveFoldersRealm: DriveFoldersRealm = {
    findByRelativePath: sinon.stub(),
    findByParentId: () => null,
    createOrReplace: () => {
      return;
    },
  };
  return new DriveRealmManager(driveFilesRealm, driveFoldersRealm);
};
