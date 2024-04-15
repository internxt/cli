import {
  EncryptionVersion,
  FetchPaginatedFile,
  FetchPaginatedFolder,
  FileMeta,
  FileStatus,
  FolderMeta,
} from '@internxt/sdk/dist/drive/storage/types';
import { getDefaultWordlist, wordlists } from 'bip39';
import crypto, { randomInt, randomUUID } from 'crypto';
import { DriveFileItem, DriveFolderItem } from '../../src/types/drive.types';

const wordlist = wordlists[getDefaultWordlist()];
const fileTypes = ['png', 'jpg', 'docx', 'pdf', 'mp4', 'mp3'];

export const newFolderItem = (attributes?: Partial<DriveFolderItem>): DriveFolderItem => {
  const folder: DriveFolderItem = {
    id: randomInt(1, 100000),
    uuid: randomUUID(),
    parentId: randomInt(1, 100000),
    bucket: crypto.randomBytes(16).toString('hex'),
    name: wordlist[randomInt(wordlist.length)],
    encryptedName: crypto.randomBytes(16).toString('hex'),
    createdAt: new Date(),
    updatedAt: new Date(),
    status: 'EXISTS',
  };
  return { ...folder, ...attributes };
};

export const newFileItem = (attributes?: Partial<DriveFileItem>): DriveFileItem => {
  const file: DriveFileItem = {
    id: randomInt(1, 100000),
    uuid: crypto.randomBytes(16).toString('hex'),
    fileId: crypto.randomBytes(16).toString('hex'),
    folderId: randomInt(1, 100000),
    bucket: crypto.randomBytes(16).toString('hex'),
    name: wordlist[randomInt(wordlist.length)],
    encryptedName: crypto.randomBytes(16).toString('hex'),
    createdAt: new Date(),
    updatedAt: new Date(),
    size: randomInt(1, 10000),
    type: fileTypes[randomInt(fileTypes.length)],
    status: FileStatus.EXISTS,
  };
  return { ...file, ...attributes };
};

export const newFolderMeta = (attributes?: Partial<FolderMeta>): FolderMeta => {
  const folder: FolderMeta = {
    bucket: crypto.randomBytes(16).toString('hex'),
    createdAt: new Date().toString(),
    deleted: false,
    deletedAt: null,
    encryptVersion: EncryptionVersion.Aes03,
    id: randomInt(1, 100000),
    name: crypto.randomBytes(16).toString('hex'),
    parent: null,
    parentId: randomInt(1, 100000),
    plainName: wordlist[randomInt(wordlist.length)],
    removed: false,
    removedAt: null,
    size: randomInt(1, 10000),
    type: 'folder',
    updatedAt: new Date().toString(),
    user: null,
    userId: randomInt(1, 100000),
    uuid: randomUUID(),
  };
  return { ...folder, ...attributes };
};

export const newFileMeta = (attributes?: Partial<FileMeta>): FileMeta => {
  const file: FileMeta = {
    bucket: crypto.randomBytes(16).toString('hex'),
    createdAt: new Date().toString(),
    created_at: new Date().toString(),
    deleted: false,
    deletedAt: null,
    encrypt_version: EncryptionVersion.Aes03,
    fileId: crypto.randomBytes(16).toString('hex'),
    folderId: randomInt(1, 100000),
    folder_id: randomInt(1, 100000),
    id: randomInt(1, 100000),
    name: crypto.randomBytes(16).toString('hex'),
    plain_name: wordlist[randomInt(wordlist.length)],
    plainName: wordlist[randomInt(wordlist.length)],
    size: randomInt(1, 10000),
    type: fileTypes[randomInt(fileTypes.length)],
    updatedAt: new Date().toString(),
    status: FileStatus.EXISTS,
    thumbnails: [],
    currentThumbnail: null,
    uuid: crypto.randomBytes(16).toString('hex'),
  };
  return { ...file, ...attributes };
};

export const newPaginatedFolder = (attributes?: Partial<FetchPaginatedFolder>): FetchPaginatedFolder => {
  const folder: FetchPaginatedFolder = {
    bucket: crypto.randomBytes(16).toString('hex'),
    createdAt: new Date(),
    deleted: false,
    deletedAt: null,
    encryptVersion: EncryptionVersion.Aes03,
    id: randomInt(1, 100000),
    name: crypto.randomBytes(16).toString('hex'),
    parent: null,
    parentId: randomInt(1, 100000),
    plainName: wordlist[randomInt(wordlist.length)],
    removed: false,
    removedAt: null,
    updatedAt: new Date(),
    user: null,
    userId: randomInt(1, 100000),
    uuid: randomUUID(),
    parentUuid: randomUUID(),
  };
  return { ...folder, ...attributes };
};

export const newPaginatedFile = (attributes?: Partial<FetchPaginatedFile>): FetchPaginatedFile => {
  const file: FetchPaginatedFile = {
    bucket: crypto.randomBytes(16).toString('hex'),
    createdAt: new Date(),
    deleted: false,
    deletedAt: null,
    encryptVersion: EncryptionVersion.Aes03,
    fileId: crypto.randomBytes(16).toString('hex'),
    folderId: randomInt(1, 100000),
    id: randomInt(1, 100000),
    name: crypto.randomBytes(16).toString('hex'),
    plainName: wordlist[randomInt(wordlist.length)],
    size: BigInt(randomInt(1, 10000)),
    type: fileTypes[randomInt(fileTypes.length)],
    updatedAt: new Date(),
    status: FileStatus.EXISTS,
    thumbnails: [],
    uuid: randomUUID(),
    folderUuid: randomUUID(),
    removed: false,
    removedAt: null,
    userId: randomInt(1, 100000),
    modificationTime: new Date(),
  };
  return { ...file, ...attributes };
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
