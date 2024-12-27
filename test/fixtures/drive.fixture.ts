import {
  CreateFolderResponse,
  EncryptionVersion,
  FetchPaginatedFile,
  FetchPaginatedFolder,
  FileMeta,
  FileStatus,
  FolderMeta,
} from '@internxt/sdk/dist/drive/storage/types';
import { DriveFileItem, DriveFolderItem } from '../../src/types/drive.types';
import { DriveFile } from '../../src/services/database/drive-file/drive-file.domain';
import { DriveFileAttributes } from '../../src/services/database/drive-file/drive-file.attributes';
import { DriveFolderAttributes } from '../../src/services/database/drive-folder/drive-folder.attributes';
import { DriveFolder } from '../../src/services/database/drive-folder/drive-folder.domain';
import Chance from 'chance';

const randomDataGenerator = new Chance();

export const FileTypesFixture = [
  'png',
  'jpg',
  'jpeg',
  'gif',
  'bmp',
  'webp',
  'tiff',
  'svg',
  'docx',
  'xlsx',
  'pptx',
  'pdf',
  'mp4',
  'mkv',
  'mov',
  'avi',
  'mp3',
  'wav',
  'flac',
  'ogg',
  'txt',
  'zip',
  'rar',
  'tar',
  'gz',
  'tgz',
  'iso',
  'exe',
  'apk',
  'deb',
];

export const newFolderItem = (attributes?: Partial<DriveFolderItem>): DriveFolderItem => {
  const createdAt = randomDataGenerator.date();
  const folder: DriveFolderItem = {
    id: randomDataGenerator.natural({ min: 1 }),
    uuid: randomDataGenerator.guid({ version: 4 }),
    bucket: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
    name: randomDataGenerator.word(),
    encryptedName: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
    createdAt: createdAt,
    updatedAt: new Date(randomDataGenerator.date({ min: createdAt })),
    status: 'EXISTS',
    parentId: randomDataGenerator.bool({ likelihood: 50 }) ? randomDataGenerator.natural({ min: 1 }) : null,
    parentUuid: randomDataGenerator.bool({ likelihood: 50 }) ? randomDataGenerator.guid({ version: 4 }) : null,
  };
  return { ...folder, ...attributes };
};

export const newFileItem = (attributes?: Partial<DriveFileItem>): DriveFileItem => {
  const createdAt = randomDataGenerator.date();
  const file: DriveFileItem = {
    id: randomDataGenerator.natural({ min: 1 }),
    uuid: randomDataGenerator.guid({ version: 4 }),
    fileId: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
    folderId: randomDataGenerator.natural({ min: 1 }),
    bucket: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
    name: randomDataGenerator.word(),
    encryptedName: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
    createdAt: createdAt,
    updatedAt: new Date(randomDataGenerator.date({ min: createdAt })),
    size: randomDataGenerator.natural({ min: 1 }),
    type: randomDataGenerator.pickone(FileTypesFixture),
    status: FileStatus.EXISTS,
    folderUuid: randomDataGenerator.guid({ version: 4 }),
  };
  return { ...file, ...attributes };
};

export const newFolderMeta = (attributes?: Partial<FolderMeta>): FolderMeta => {
  const createdAt = randomDataGenerator.date();
  const folder: FolderMeta = {
    bucket: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
    createdAt: createdAt.toString(),
    created_at: createdAt.toString(),
    deleted: false,
    deletedAt: null,
    deleted_at: null,
    encryptVersion: EncryptionVersion.Aes03,
    encrypt_version: EncryptionVersion.Aes03,
    id: randomDataGenerator.natural({ min: 1 }),
    name: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
    parent: null,
    parentId: randomDataGenerator.natural({ min: 1 }),
    parent_id: randomDataGenerator.natural({ min: 1 }),
    plainName: randomDataGenerator.word(),
    plain_name: randomDataGenerator.word(),
    removed: false,
    removedAt: null,
    removed_at: null,
    size: 0,
    type: 'folder',
    updatedAt: new Date(randomDataGenerator.date({ min: createdAt })).toString(),
    updated_at: new Date(randomDataGenerator.date({ min: createdAt })).toString(),
    user: null,
    userId: randomDataGenerator.natural({ min: 1 }),
    user_id: randomDataGenerator.natural({ min: 1 }),
    uuid: randomDataGenerator.guid({ version: 4 }),
    parentUuid: randomDataGenerator.guid({ version: 4 }),
    parent_uuid: randomDataGenerator.guid({ version: 4 }),
    creation_time: new Date(randomDataGenerator.date({ min: createdAt })).toString(),
    modification_time: new Date(randomDataGenerator.date({ min: createdAt })).toString(),
  };
  return { ...folder, ...attributes };
};

export const newFileMeta = (attributes?: Partial<FileMeta>): FileMeta => {
  const createdAt = randomDataGenerator.date();
  const file: FileMeta = {
    bucket: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
    createdAt: createdAt.toString(),
    created_at: createdAt.toString(),
    deleted: false,
    deletedAt: null,
    encrypt_version: EncryptionVersion.Aes03,
    fileId: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
    folderId: randomDataGenerator.natural({ min: 1 }),
    folder_id: randomDataGenerator.natural({ min: 1 }),
    id: randomDataGenerator.natural({ min: 1 }),
    name: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
    plain_name: randomDataGenerator.word(),
    plainName: randomDataGenerator.word(),
    size: randomDataGenerator.natural({ min: 1 }),
    type: randomDataGenerator.pickone(FileTypesFixture),
    updatedAt: new Date(randomDataGenerator.date({ min: createdAt })).toString(),
    status: FileStatus.EXISTS,
    thumbnails: [],
    currentThumbnail: null,
    uuid: randomDataGenerator.guid({ version: 4 }),
    folderUuid: randomDataGenerator.guid({ version: 4 }),
  };
  return { ...file, ...attributes };
};

export const newPaginatedFolder = (attributes?: Partial<FetchPaginatedFolder>): FetchPaginatedFolder => {
  const createdAt = randomDataGenerator.date();
  const folder: FetchPaginatedFolder = {
    bucket: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
    createdAt: createdAt,
    deleted: false,
    deletedAt: null,
    encryptVersion: EncryptionVersion.Aes03,
    id: randomDataGenerator.natural({ min: 1 }),
    name: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
    parent: null,
    parentId: randomDataGenerator.natural({ min: 1 }),
    plainName: randomDataGenerator.word(),
    removed: false,
    removedAt: null,
    updatedAt: new Date(randomDataGenerator.date({ min: createdAt })),
    user: null,
    userId: randomDataGenerator.natural({ min: 1 }),
    uuid: randomDataGenerator.guid({ version: 4 }),
    parentUuid: randomDataGenerator.guid({ version: 4 }),
  };
  return { ...folder, ...attributes };
};

export const newPaginatedFile = (attributes?: Partial<FetchPaginatedFile>): FetchPaginatedFile => {
  const createdAt = randomDataGenerator.date();
  const file: FetchPaginatedFile = {
    bucket: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
    createdAt: createdAt,
    deleted: false,
    deletedAt: null,
    encryptVersion: EncryptionVersion.Aes03,
    fileId: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
    folderId: randomDataGenerator.natural({ min: 1 }),
    id: randomDataGenerator.natural({ min: 1 }),
    name: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
    plainName: randomDataGenerator.word(),
    size: BigInt(randomDataGenerator.natural({ min: 1 })),
    type: randomDataGenerator.pickone(FileTypesFixture),
    updatedAt: new Date(randomDataGenerator.date({ min: createdAt })),
    status: FileStatus.EXISTS,
    thumbnails: [],
    uuid: randomDataGenerator.guid({ version: 4 }),
    folderUuid: randomDataGenerator.guid({ version: 4 }),
    removed: false,
    removedAt: null,
    userId: randomDataGenerator.natural({ min: 1 }),
    modificationTime: new Date(randomDataGenerator.date({ min: createdAt })),
  };
  return { ...file, ...attributes };
};

export const newDriveFolder = (attributes?: Partial<DriveFolderAttributes>): DriveFolder => {
  const createdAt = randomDataGenerator.date();
  const name = randomDataGenerator.word();
  const folder: DriveFolderAttributes = {
    id: randomDataGenerator.natural({ min: 1 }),
    name: name,
    uuid: randomDataGenerator.guid({ version: 4 }),
    relativePath: `/${name}`,
    parentId: randomDataGenerator.natural({ min: 1 }),
    parentUuid: randomDataGenerator.guid({ version: 4 }),
    createdAt: createdAt,
    updatedAt: new Date(randomDataGenerator.date({ min: createdAt })),
    status: FileStatus.EXISTS,
  };
  return new DriveFolder({ ...folder, ...attributes });
};

export const newDriveFile = (attributes?: Partial<DriveFileAttributes>): DriveFile => {
  const createdAt = randomDataGenerator.date();
  const name = randomDataGenerator.word();
  const type = randomDataGenerator.pickone(FileTypesFixture);
  const file: DriveFileAttributes = {
    id: randomDataGenerator.natural({ min: 1 }),
    name: name,
    type: type,
    uuid: randomDataGenerator.guid({ version: 4 }),
    fileId: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
    folderId: randomDataGenerator.natural({ min: 1 }),
    folderUuid: randomDataGenerator.guid({ version: 4 }),
    bucket: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
    relativePath: `/${name}.${type}`,
    createdAt: createdAt,
    updatedAt: new Date(randomDataGenerator.date({ min: createdAt })),
    size: randomDataGenerator.natural({ min: 1 }),
    status: FileStatus.EXISTS,
  };
  return new DriveFile({ ...file, ...attributes });
};

export const generateSubcontent = (uuid: string, countFolders: number, countFiles: number) => {
  const folders: FetchPaginatedFolder[] = [];
  const files: FetchPaginatedFile[] = [];
  for (let i = 0; i < countFolders; i++) {
    folders.push(newPaginatedFolder({ parentUuid: uuid }));
  }
  for (let i = 0; i < countFiles; i++) {
    files.push(newPaginatedFile({ folderUuid: uuid }));
  }
  return { folders, files };
};

export const newCreateFolderResponse = (attributes?: Partial<CreateFolderResponse>): CreateFolderResponse => {
  const createdAt = randomDataGenerator.date();
  const folder: CreateFolderResponse = {
    id: randomDataGenerator.natural({ min: 1 }),
    parentId: randomDataGenerator.natural({ min: 1 }),
    parentUuid: randomDataGenerator.guid({ version: 4 }),
    name: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
    bucket: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
    userId: randomDataGenerator.natural({ min: 1 }),
    encryptVersion: EncryptionVersion.Aes03,
    deleted: false,
    deletedAt: null,
    createdAt: createdAt,
    updatedAt: new Date(randomDataGenerator.date({ min: createdAt })),
    uuid: randomDataGenerator.guid({ version: 4 }),
    plainName: randomDataGenerator.word(),
    removed: false,
    removedAt: null,
    creationTime: new Date(randomDataGenerator.date({ min: createdAt })),
    modificationTime: new Date(randomDataGenerator.date({ min: createdAt })),
  };
  return { ...folder, ...attributes };
};
