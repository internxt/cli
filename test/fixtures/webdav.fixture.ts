import { mockReq, mockRes } from 'sinon-express-mock';
import { Request, Response } from 'express';
import { UserSettingsFixture } from './auth.fixture';
import { WebDavRequestedResource } from '../../src/types/webdav.types';
import path from 'path';

export function createWebDavRequestFixture<T extends object>(request: T): mockReq.MockReq & T & Request {
  const userSettings = UserSettingsFixture;
  return mockReq({
    // @ts-expect-error - User is not defined in the Request type from the sinon-express-mock package
    user: request.user ?? {
      rootFolderId: userSettings.root_folder_id,
    },
    ...request,
  });
}

export function createWebDavResponseFixture<T extends object>(response: T): mockRes.MockRes & T & Response {
  return mockRes(response);
}

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
