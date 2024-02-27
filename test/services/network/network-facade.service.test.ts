import * as NetworkUpload from '@internxt/sdk/dist/network/upload';
import * as NetworkDownload from '@internxt/sdk/dist/network/download';

import { NetworkFacade } from '../../../src/services/network/network-facade.service';
import { SdkManager } from '../../../src/services/sdk-manager.service';
import path from 'path';
import { createReadStream, createWriteStream } from 'fs';
import sinon, { SinonSandbox } from 'sinon';
import { expect } from 'chai';
import { UploadService } from '../../../src/services/network/upload.service';
import { CryptoService } from '../../../src/services/crypto.service';
import { DownloadService } from '../../../src/services/network/download.service';
import { StreamUtils } from '../../../src/utils/stream.utils';
import { PassThrough, Readable, Writable } from 'stream';
import { CommonFixture } from '../../fixtures/common.fixture';
describe('Network Facade Service', () => {
  let networkFacadeSandbox: SinonSandbox;

  beforeEach(() => {
    networkFacadeSandbox = sinon.createSandbox();
  });

  afterEach(() => {
    networkFacadeSandbox.restore();
  });
  const getNetworkMock = () => {
    return SdkManager.instance.getNetwork({
      user: 'user',
      pass: 'pass',
    });
  };
  it('When a file is prepared to upload, should return an abort controller and a promise to execute the upload', async () => {
    const sut = new NetworkFacade(
      getNetworkMock(),
      UploadService.instance,
      DownloadService.instance,
      CryptoService.instance,
    );
    const file = path.join(process.cwd(), 'test/fixtures/test-content.fixture.txt');
    const readStream = createReadStream(file);
    const options = {
      progressCallback: sinon.stub(),
      abortController: new AbortController(),
    };

    const result = await sut.uploadFromStream(
      'f1858bc9675f9e4f7ab29429',
      'animal fog wink trade december thumb sight cousin crunch plunge captain enforce letter creek text',
      100,
      StreamUtils.readStreamToReadableStream(readStream),
      options,
    );

    expect(result[0]).to.be.instanceOf(Promise);
    expect(result[1]).to.be.instanceOf(AbortController);
  });

  it('When a file is uploaded, should return the fileId', async () => {
    const sut = new NetworkFacade(
      getNetworkMock(),
      UploadService.instance,
      DownloadService.instance,
      CryptoService.instance,
    );
    const file = path.join(process.cwd(), 'test/fixtures/test-content.fixture.txt');
    const readStream = createReadStream(file);
    const options = {
      progressCallback: sinon.stub(),
      abortController: new AbortController(),
    };

    networkFacadeSandbox.stub(NetworkUpload, 'uploadFile').resolves('uploaded_file_id');
    const [executeUpload] = await sut.uploadFromStream(
      'f1858bc9675f9e4f7ab29429',
      'animal fog wink trade december thumb sight cousin crunch plunge captain enforce letter creek text',
      100,
      StreamUtils.readStreamToReadableStream(readStream),
      options,
    );

    const uploadResult = await executeUpload;

    expect(uploadResult.fileId).to.be.equal('uploaded_file_id');
  });

  it.skip('When a file is downloaded, should return write to a stream', async (done) => {
    const encryptedContent = Buffer.from('encrypted-content');
    const readableContent = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(encryptedContent);
      },
    });

    const networkMock = getNetworkMock();
    sinon.stub(networkMock, 'getDownloadLinks').resolves({
      index: '4ae6fcc4dd6ebcdb9076f2396d64da48',
      bucket: CommonFixture.createObjectId(),
      created: new Date(),
      size: 100,
      shards: [
        {
          url: 'https://stub.com/file',
          index: 0,
          size: 100,
          hash: '123456',
        },
      ],
      version: 2,
    });
    const downloadServiceStub = DownloadService.instance;
    sinon.stub(downloadServiceStub, 'downloadFile').resolves(readableContent);
    const sut = new NetworkFacade(networkMock, UploadService.instance, downloadServiceStub, CryptoService.instance);

    const chunks: Uint8Array[] = [];

    const fileToWrite = path.join(process.cwd(), 'test/fixtures/test-writable-network-facade.fixture.txt');
    const writable = new WritableStream();
    const [executeDownload] = await sut.downloadToStream(
      'f1858bc9675f9e4f7ab29429',
      'animal fog wink trade december thumb sight cousin crunch plunge captain enforce letter creek text',
      'f1858bc9675f9e4f7ab29429',
      writable,
    );

    await executeDownload;
    done();
  });
});
