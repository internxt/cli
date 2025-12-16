import {
  CreateFolderResponse,
  EncryptionVersion,
  FetchPaginatedFile,
  FetchPaginatedFolder,
  FileMeta,
  FileStatus,
  FolderMeta,
} from '@internxt/sdk/dist/drive/storage/types';
import { getDefaultWordlist, wordlists } from 'bip39';
import crypto, { randomInt, randomUUID } from 'node:crypto';
import { DriveFileItem, DriveFolderItem } from '../../src/types/drive.types';
import { DriveFile } from '../../src/services/database/drive-file/drive-file.domain';
import { DriveFileAttributes } from '../../src/services/database/drive-file/drive-file.attributes';
import { DriveFolderAttributes } from '../../src/services/database/drive-folder/drive-folder.attributes';
import { DriveFolder } from '../../src/services/database/drive-folder/drive-folder.domain';

const wordlist = wordlists[getDefaultWordlist()];
const fileTypes = ['png', 'jpg', 'docx', 'pdf', 'mp4', 'mp3'];

const getRandomDate = (start = new Date(2000, 0, 1), end = new Date()) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
};

export const newFolderItem = (attributes?: Partial<DriveFolderItem>): DriveFolderItem => {
  const folder: DriveFolderItem = {
    itemType: 'folder',
    id: randomInt(1, 100000),
    uuid: randomUUID(),
    parentId: randomInt(1, 100000),
    bucket: crypto.randomBytes(16).toString('hex'),
    name: wordlist[randomInt(wordlist.length)],
    encryptedName: crypto.randomBytes(16).toString('hex'),
    createdAt: getRandomDate(),
    updatedAt: getRandomDate(),
    status: 'EXISTS',
    parentUuid: randomUUID(),
  };
  return { ...folder, ...attributes };
};

export const newFileItem = (attributes?: Partial<DriveFileItem>): DriveFileItem => {
  const file: DriveFileItem = {
    itemType: 'file',
    id: randomInt(1, 100000),
    uuid: crypto.randomBytes(16).toString('hex'),
    fileId: crypto.randomBytes(16).toString('hex'),
    folderId: randomInt(1, 100000),
    bucket: crypto.randomBytes(16).toString('hex'),
    name: wordlist[randomInt(wordlist.length)],
    createdAt: getRandomDate(),
    updatedAt: getRandomDate(),
    size: randomInt(1, 10000),
    type: fileTypes[randomInt(fileTypes.length)],
    status: FileStatus.EXISTS,
    folderUuid: randomUUID(),
    creationTime: getRandomDate(),
    modificationTime: getRandomDate(),
  };
  return { ...file, ...attributes };
};

export const newFolderMeta = (attributes?: Partial<FolderMeta>): FolderMeta => {
  const createdAt = getRandomDate();
  const updatedAt = getRandomDate();
  const folder: FolderMeta = {
    bucket: crypto.randomBytes(16).toString('hex'),
    createdAt: createdAt.toString(),
    created_at: createdAt.toString(),
    deleted: false,
    deletedAt: null,
    deleted_at: null,
    encryptVersion: EncryptionVersion.Aes03,
    encrypt_version: EncryptionVersion.Aes03,
    id: randomInt(1, 100000),
    name: crypto.randomBytes(16).toString('hex'),
    parent: null,
    parentId: randomInt(1, 100000),
    parent_id: randomInt(1, 100000),
    plainName: wordlist[randomInt(wordlist.length)],
    plain_name: wordlist[randomInt(wordlist.length)],
    removed: false,
    removedAt: null,
    removed_at: null,
    size: randomInt(1, 10000),
    type: 'folder',
    updatedAt: updatedAt.toString(),
    updated_at: updatedAt.toString(),
    user: null,
    userId: randomInt(1, 100000),
    user_id: randomInt(1, 100000),
    uuid: randomUUID(),
    parentUuid: randomUUID(),
    parent_uuid: randomUUID(),
    creation_time: getRandomDate().toString(),
    modification_time: getRandomDate().toString(),
  };
  return { ...folder, ...attributes };
};

export const newFileMeta = (attributes?: Partial<FileMeta>): FileMeta => {
  const file: FileMeta = {
    bucket: crypto.randomBytes(16).toString('hex'),
    createdAt: getRandomDate().toString(),
    encryptVersion: EncryptionVersion.Aes03,
    fileId: crypto.randomBytes(16).toString('hex'),
    folderId: randomInt(1, 100000),
    id: randomInt(1, 100000),
    name: crypto.randomBytes(16).toString('hex'),
    plainName: wordlist[randomInt(wordlist.length)],
    size: randomInt(1, 10000).toString(),
    type: fileTypes[randomInt(fileTypes.length)],
    updatedAt: getRandomDate().toString(),
    status: FileStatus.EXISTS,
    uuid: crypto.randomBytes(16).toString('hex'),
    folderUuid: crypto.randomBytes(16).toString('hex'),
    creationTime: getRandomDate().toString(),
    modificationTime: getRandomDate().toString(),
    userId: randomInt(1, 100000),
  };
  return { ...file, ...attributes };
};

export const newPaginatedFolder = (attributes?: Partial<FetchPaginatedFolder>): FetchPaginatedFolder => {
  const folder: FetchPaginatedFolder = {
    bucket: crypto.randomBytes(16).toString('hex'),
    createdAt: getRandomDate().toISOString(),
    deleted: false,
    encryptVersion: EncryptionVersion.Aes03,
    id: randomInt(1, 100000),
    name: crypto.randomBytes(16).toString('hex'),
    parent: {},
    parentId: randomInt(1, 100000),
    plainName: wordlist[randomInt(wordlist.length)],
    removed: false,
    updatedAt: getRandomDate().toISOString(),
    userId: randomInt(1, 100000),
    uuid: randomUUID(),
    parentUuid: randomUUID(),
    creationTime: getRandomDate().toISOString(),
    modificationTime: getRandomDate().toISOString(),
    size: 0,
    type: 'folder',
    status: FileStatus.EXISTS,
  };
  return { ...folder, ...attributes };
};

export const newPaginatedFile = (attributes?: Partial<FetchPaginatedFile>): FetchPaginatedFile => {
  const file: FetchPaginatedFile = {
    bucket: crypto.randomBytes(16).toString('hex'),
    createdAt: getRandomDate().toISOString(),
    encryptVersion: EncryptionVersion.Aes03,
    fileId: crypto.randomBytes(16).toString('hex'),
    folderId: randomInt(1, 100000),
    id: randomInt(1, 100000),
    name: crypto.randomBytes(16).toString('hex'),
    plainName: wordlist[randomInt(wordlist.length)],
    size: String(randomInt(1, 10000)),
    type: fileTypes[randomInt(fileTypes.length)],
    updatedAt: getRandomDate().toISOString(),
    status: FileStatus.EXISTS,
    uuid: randomUUID(),
    folderUuid: randomUUID(),
    userId: randomInt(1, 100000),
    creationTime: getRandomDate().toISOString(),
    modificationTime: getRandomDate().toISOString(),
  };
  return { ...file, ...attributes };
};

export const newDriveFolder = (attributes?: Partial<DriveFolderAttributes>): DriveFolder => {
  const folder: DriveFolderAttributes = {
    id: randomInt(1, 100000),
    name: crypto.randomBytes(16).toString('hex'),
    uuid: crypto.randomBytes(16).toString('hex'),
    relativePath: crypto.randomBytes(16).toString('hex'),
    parentId: randomInt(1, 100000),
    parentUuid: crypto.randomBytes(16).toString('hex'),
    createdAt: getRandomDate(),
    updatedAt: getRandomDate(),
    status: FileStatus.EXISTS,
  };
  return new DriveFolder({ ...folder, ...attributes });
};

export const newDriveFile = (attributes?: Partial<DriveFileAttributes>): DriveFile => {
  const file: DriveFileAttributes = {
    id: randomInt(1, 100000),
    name: crypto.randomBytes(16).toString('hex'),
    type: fileTypes[randomInt(fileTypes.length)],
    uuid: crypto.randomBytes(16).toString('hex'),
    fileId: crypto.randomBytes(16).toString('hex'),
    folderId: randomInt(1, 100000),
    folderUuid: crypto.randomBytes(16).toString('hex'),
    bucket: crypto.randomBytes(16).toString('hex'),
    relativePath: crypto.randomBytes(16).toString('hex'),
    createdAt: getRandomDate(),
    updatedAt: getRandomDate(),
    size: randomInt(1, 10000),
    status: FileStatus.EXISTS,
    creationTime: getRandomDate(),
    modificationTime: getRandomDate(),
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
  const folder: CreateFolderResponse = {
    id: randomInt(1, 100000),
    parentId: randomInt(1, 100000),
    parentUuid: randomUUID(),
    name: crypto.randomBytes(16).toString('hex'),
    bucket: crypto.randomBytes(16).toString('hex'),
    userId: randomInt(1, 100000),
    encryptVersion: EncryptionVersion.Aes03,
    deleted: false,
    deletedAt: null,
    createdAt: getRandomDate(),
    updatedAt: getRandomDate(),
    uuid: randomUUID(),
    plainName: wordlist[randomInt(wordlist.length)],
    removed: false,
    removedAt: null,
    creationTime: getRandomDate(),
    modificationTime: getRandomDate(),
  };
  return { ...folder, ...attributes };
};
