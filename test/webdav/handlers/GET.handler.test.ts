import sinon from 'sinon';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';
import { GETRequestHandler } from '../../../src/webdav/handlers/GET.handler';
import { DriveFileService } from '../../../src/services/drive/drive-file.service';
import { getDriveRealmManager } from '../../fixtures/drive-realm.fixture';
import { CryptoService } from '../../../src/services/crypto.service';
import { DownloadService } from '../../../src/services/network/download.service';
import { UploadService } from '../../../src/services/network/upload.service';
import { AuthService } from '../../../src/services/auth.service';
import { expect } from 'chai';
import { NotImplementedError } from '../../../src/utils/errors.utils';

describe('GET request handler', () => {
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });
  it('When a WebDav client sends a GET request, and it contains a content-range header, should throw a NotImplementedError ', async () => {
    const sut = new GETRequestHandler({
      driveFileService: DriveFileService.instance,
      uploadService: UploadService.instance,
      downloadService: DownloadService.instance,
      driveRealmManager: getDriveRealmManager(),
      authService: AuthService.instance,
      cryptoService: CryptoService.instance,
    });

    const request = createWebDavRequestFixture({
      method: 'GET',
      url: '/file.txt',
      headers: {
        'content-range': 'bytes 0-100/200',
      },
    });

    const response = createWebDavResponseFixture({
      status: sandbox.stub().returns({ send: sandbox.stub() }),
    });

    try {
      await sut.handle(request, response);
      expect(true).to.be.false;
    } catch (error) {
      expect(error).to.be.instanceOf(NotImplementedError);
    }
  });
});
