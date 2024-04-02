import sinon from 'sinon';
import { DriveFile } from '../../src/services/database/drive-file/drive-file.domain';
import { DriveFolder } from '../../src/services/database/drive-folder/drive-folder.domain';
import { DriveDatabaseManager } from '../../src/services/database/drive-database-manager.service';
import { DriveFileRepository } from '../../src/services/database/drive-file/drive-file.repository';
import { DriveFolderRepository } from '../../src/services/database/drive-folder/drive-folder.repository';

export const getDriveFileDatabaseFixture = (payload: Partial<DriveFile> = {}): DriveFile => {
  // @ts-expect-error - We only mock the properties we need
  const object: DriveFile = {
    id: new Date().getTime(),
    name: `file_${new Date().getTime().toString()}`,
    uuid: `uuid_${new Date().getTime().toString()}`,
    relativePath: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'EXISTS',
    fileId: `file_id_${new Date().getTime().toString()}`,
    folderId: 0,
    bucket: new Date().getTime().toString(),
    size: 0,
  };

  // @ts-expect-error - We only mock the properties we need
  return {
    ...object,
    ...payload,
  };
};

export const getDriveFolderDatabaseFixture = (payload: Partial<DriveFolder> = {}): DriveFolder => {
  // @ts-expect-error - We only mock the properties we need
  const object: DriveFolder = {
    id: new Date().getTime(),
    name: `folder_${new Date().getTime().toString()}`,
    uuid: `uuid_${new Date().getTime().toString()}`,
    relativePath: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  // @ts-expect-error - We only mock the properties we need
  return {
    ...object,
    ...payload,
  };
};

export const getDriveDatabaseManager = (): DriveDatabaseManager => {
  // @ts-expect-error - We only mock the properties we need
  const driveFileRepository: DriveFileRepository = {
    findByRelativePath: sinon.stub(),
    findById: sinon.stub(),
  };

  // @ts-expect-error - We only mock the properties we need
  const driveFolderRepository: DriveFolderRepository = {
    findById: sinon.stub(),
    findByRelativePath: sinon.stub(),
    findByParentId: sinon.stub(),
    createFolder: sinon.stub(),
  };
  return new DriveDatabaseManager(driveFileRepository, driveFolderRepository);
};
