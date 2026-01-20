import { getMockReq, getMockRes } from 'vitest-mock-express';
import { Request, Response } from 'express';
import { WebDavRequestedResource } from '../../src/types/webdav.types';
import path from 'node:path';
import { SdkManager } from '../../src/services/sdk-manager.service';
import { Environment } from '@internxt/inxt-js';
import { ConfigService } from '../../src/services/config.service';
import { UserFixture } from './auth.fixture';
import { NetworkFacade } from '../../src/services/network/network-facade.service';

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
    url: completeURL,
  };
};

export const getNetworkMock = () => {
  return SdkManager.instance.getNetwork({
    user: 'user',
    pass: 'pass',
  });
};

export const getEnvironmentMock = () => {
  return new Environment({
    bridgeUser: 'user',
    bridgePass: 'pass',
    bridgeUrl: ConfigService.instance.get('NETWORK_URL'),
    encryptionKey: UserFixture.mnemonic,
    appDetails: SdkManager.getAppDetails(),
  });
};

export const getNetworkFacadeMock = () => {
  return new NetworkFacade(getNetworkMock(), getEnvironmentMock());
};
