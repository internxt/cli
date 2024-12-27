import { vi } from 'vitest';
import { DriveFile } from '../../src/services/database/drive-file/drive-file.domain';
import { DriveFolder } from '../../src/services/database/drive-folder/drive-folder.domain';
import { DriveDatabaseManager } from '../../src/services/database/drive-database-manager.service';
import { DriveFileRepository } from '../../src/services/database/drive-file/drive-file.repository';
import { DriveFolderRepository } from '../../src/services/database/drive-folder/drive-folder.repository';
import Chance from 'chance';

const randomDataGenerator = new Chance();

export const getDriveFileDatabaseFixture = (): DriveFile => {
  const createdAt = randomDataGenerator.date();
  const name = randomDataGenerator.word();
  const ext = randomDataGenerator.word();
  const filePath = `/${name}.${ext}`;
  const object: DriveFile = new DriveFile({
    uuid: randomDataGenerator.guid({ version: 4 }),
    id: randomDataGenerator.natural({ min: 1 }),
    name: name,
    type: ext,
    relativePath: filePath,
    createdAt,
    updatedAt: new Date(randomDataGenerator.date({ min: createdAt })),
    fileId: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
    bucket: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
    size: randomDataGenerator.natural({ min: 1 }),
    folderId: randomDataGenerator.natural({ min: 1 }),
    folderUuid: randomDataGenerator.guid({ version: 4 }),
    status: 'EXISTS',
  });
  return object;
};

export const getDriveFolderDatabaseFixture = (): DriveFolder => {
  const createdAt = randomDataGenerator.date();
  const name = randomDataGenerator.word();
  const folderPath = `/${name}`;
  const object: DriveFolder = new DriveFolder({
    id: randomDataGenerator.natural({ min: 1 }),
    name: name,
    uuid: randomDataGenerator.guid({ version: 4 }),
    relativePath: folderPath,
    createdAt: createdAt,
    updatedAt: new Date(randomDataGenerator.date({ min: createdAt })),
    parentId: randomDataGenerator.natural({ min: 1 }),
    parentUuid: randomDataGenerator.guid({ version: 4 }),
    status: 'EXISTS',
  });

  return object;
};

export const getDriveDatabaseManager = (): DriveDatabaseManager => {
  // @ts-expect-error - We only mock the properties we need
  const driveFileRepository: DriveFileRepository = {
    findByRelativePath: vi.fn(),
    findById: vi.fn(),
  };

  // @ts-expect-error - We only mock the properties we need
  const driveFolderRepository: DriveFolderRepository = {
    findById: vi.fn(),
    findByRelativePath: vi.fn(),
    createFolder: vi.fn(),
  };
  return new DriveDatabaseManager(driveFileRepository, driveFolderRepository);
};
