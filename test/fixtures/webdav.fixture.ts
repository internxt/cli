import { getMockReq, getMockRes } from 'vitest-mock-express';
import { Request, Response } from 'express';
import { WebDavRequestedResource } from '../../src/types/webdav.types';
import path from 'node:path';

export const createWebDavRequestFixture = <T extends object>(request: T): T & Request => {
  return getMockReq({
    ...request,
  });
};

export const createWebDavResponseFixture = <T extends object>(response: T): Response => {
  return getMockRes(response).res;
};

export const getRequestedFileResource = ({
  parentFolder = '/',
  fileName = 'file',
  fileType = 'txt',
} = {}): WebDavRequestedResource => {
  if (!parentFolder.startsWith('/')) {
    parentFolder = '/'.concat(parentFolder);
  }
  if (!parentFolder.endsWith('/')) {
    parentFolder = parentFolder.concat('/');
  }
  const completeURL = parentFolder.concat(fileType ? fileName + '.' + fileType : fileName);
  return {
    name: fileName,
    parentPath: parentFolder,
    path: path.parse(completeURL),
    type: 'file',
    url: completeURL,
  };
};

export const getRequestedFolderResource = ({
  parentFolder = '/',
  folderName = 'folder',
} = {}): WebDavRequestedResource => {
  if (!parentFolder.startsWith('/')) {
    parentFolder = '/'.concat(parentFolder);
  }
  if (!parentFolder.endsWith('/')) {
    parentFolder = parentFolder.concat('/');
  }
  folderName = folderName.replaceAll('/', '');

  let completeURL = parentFolder.concat(folderName);
  if (!completeURL.endsWith('/')) {
    completeURL = completeURL.concat('/');
  }
  return {
    name: folderName,
    parentPath: parentFolder,
    path: path.parse(completeURL),
    type: 'folder',
    url: completeURL,
  };
};
