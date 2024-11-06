import sinon from 'sinon';
import { DriveFile } from '../../src/services/database/drive-file/drive-file.domain';
import { DriveFolder } from '../../src/services/database/drive-folder/drive-folder.domain';
import { DriveDatabaseManager } from '../../src/services/database/drive-database-manager.service';
import { DriveFileRepository } from '../../src/services/database/drive-file/drive-file.repository';
import { DriveFolderRepository } from '../../src/services/database/drive-folder/drive-folder.repository';
import { randomInt, randomUUID } from 'crypto';

export const getDriveFileDatabaseFixture = (): DriveFile => {
  const object: DriveFile = new DriveFile({
    id: randomInt(2000),
    name: `file_${new Date().getTime().toString()}`,
    uuid: randomUUID(),
    relativePath: `file_${new Date().getTime().toString()}.txt`,
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'EXISTS',
    fileId: `file_id_${new Date().getTime().toString()}`,
    folderId: randomInt(2000),
    bucket: new Date().getTime().toString(),
    size: randomInt(2000),
    folderUuid: randomUUID(),
    type: 'txt',
  });
  return object;
};

export const getDriveFolderDatabaseFixture = (): DriveFolder => {
  const object: DriveFolder = new DriveFolder({
    id: randomInt(2000),
    name: `folder_${new Date().getTime().toString()}`,
    uuid: randomUUID(),
    relativePath: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    parentId: randomInt(2000),
    parentUuid: randomUUID(),
    status: 'EXISTS',
  });

  return object;
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
    createFolder: sinon.stub(),
  };
  return new DriveDatabaseManager(driveFileRepository, driveFolderRepository);
};
