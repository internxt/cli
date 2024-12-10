import { beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { randomBytes, randomInt } from 'node:crypto';
import http from 'http';
import https from 'https';
import { ConfigService } from '../../src/services/config.service';
import { DriveFolderService } from '../../src/services/drive/drive-folder.service';
import { WebDavServer } from '../../src/webdav/webdav-server';
import { getDriveDatabaseManager } from '../fixtures/drive-database.fixture';
import { UploadService } from '../../src/services/network/upload.service';
import { DriveFileService } from '../../src/services/drive/drive-file.service';
import { DownloadService } from '../../src/services/network/download.service';
import { AuthService } from '../../src/services/auth.service';
import { CryptoService } from '../../src/services/crypto.service';
import { NetworkUtils } from '../../src/utils/network.utils';
import { TrashService } from '../../src/services/drive/trash.service';
import { WebdavConfig } from '../../src/types/command.types';
import { UserCredentialsFixture } from '../fixtures/login.fixture';

describe('WebDav server', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When the WebDav server is started with https, it should generate self-signed certificates', async () => {
    const webdavConfig: WebdavConfig = {
      port: randomInt(65535).toString(),
      protocol: 'https',
    };
    const sslSelfSigned = {
      private: randomBytes(8).toString('hex'),
      public: randomBytes(8).toString('hex'),
      cert: randomBytes(8).toString('hex'),
      fingerprint: randomBytes(8).toString('hex'),
    };

    vi.spyOn(ConfigService.instance, 'readWebdavConfig').mockResolvedValue(webdavConfig);
    vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(UserCredentialsFixture);
    // @ts-expect-error - We stub the method partially
    const createHTTPSServerStub = vi.spyOn(https, 'createServer').mockReturnValue({
      listen: vi.fn().mockResolvedValue({}),
    });
    // @ts-expect-error - We stub the method partially
    const createHTTPServerStub = vi.spyOn(http, 'createServer').mockReturnValue({
      listen: vi.fn().mockRejectedValue(new Error()),
    });
    vi.spyOn(NetworkUtils, 'getWebdavSSLCerts').mockResolvedValue({
      cert: sslSelfSigned.cert,
      key: sslSelfSigned.private,
    });

    const app = express();
    const server = new WebDavServer(
      app,
      ConfigService.instance,
      DriveFileService.instance,
      DriveFolderService.instance,
      getDriveDatabaseManager(),
      UploadService.instance,
      DownloadService.instance,
      AuthService.instance,
      CryptoService.instance,
      TrashService.instance,
    );
    await server.start();

    expect(createHTTPSServerStub).toHaveBeenCalledOnce();
    expect(createHTTPSServerStub).toHaveBeenCalledWith({ cert: sslSelfSigned.cert, key: sslSelfSigned.private }, app);
    expect(createHTTPServerStub).not.toHaveBeenCalled();
  });

  it('When the WebDav server is started with http, it should run http', async () => {
    const webdavConfig: WebdavConfig = {
      port: randomInt(65535).toString(),
      protocol: 'http',
    };

    vi.spyOn(ConfigService.instance, 'readWebdavConfig').mockResolvedValue(webdavConfig);
    vi.spyOn(ConfigService.instance, 'readUser').mockResolvedValue(UserCredentialsFixture);
    // @ts-expect-error - We stub the method partially
    const createHTTPServerStub = vi.spyOn(http, 'createServer').mockReturnValue({
      listen: vi.fn().mockResolvedValue({}),
    });
    // @ts-expect-error - We stub the method partially
    const createHTTPSServerStub = vi.spyOn(https, 'createServer').mockReturnValue({
      listen: vi.fn().mockRejectedValue(new Error()),
    });

    const app = express();
    const server = new WebDavServer(
      app,
      ConfigService.instance,
      DriveFileService.instance,
      DriveFolderService.instance,
      getDriveDatabaseManager(),
      UploadService.instance,
      DownloadService.instance,
      AuthService.instance,
      CryptoService.instance,
      TrashService.instance,
    );
    await server.start();

    expect(createHTTPServerStub).toHaveBeenCalledOnce();
    expect(createHTTPServerStub).toHaveBeenCalledWith(app);
    expect(createHTTPSServerStub).not.toHaveBeenCalled();
  });
});
