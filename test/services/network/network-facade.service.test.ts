import * as NetworkUpload from '@internxt/sdk/dist/network/upload';

import { NetworkFacade } from '../../../src/services/network/network-facade.service';
import { SdkManager } from '../../../src/services/sdk-manager.service';
import path from 'path';
import { createReadStream } from 'fs';
import sinon, { SinonSandbox } from 'sinon';
import { expect } from 'chai';
import { UploadService } from '../../../src/services/network/upload.service';
import { CryptoService } from '../../../src/services/crypto.service';
import { DownloadService } from '../../../src/services/network/download.service';
import { StreamUtils } from '../../../src/utils/stream.utils';
import { Readable } from 'stream';
import axios from 'axios';

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

  it('When a file is downloaded, should write it to a stream', async () => {
    const encryptedContent = Buffer.from('b6ccfa381c150f3a4b65245bffa4d84087', 'hex');
    const bucket = 'cd8abd7e8b13081660b58dbe';
    const readableContent = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(encryptedContent);
        controller.close();
      },
    });

    const networkMock = getNetworkMock();
    networkFacadeSandbox.stub(networkMock, 'getDownloadLinks').resolves({
      index: '29f07b8914d8353b663ab783f4bbe9950fdde680a69524405790cecca9c549f9',
      bucket: bucket,
      created: new Date(),
      size: 100,
      shards: [
        {
          url: 'https://doesnotexists.com/file',
          index: 0,
          size: 17,
          hash: 'a4fc32830aee362a407085f3683f20825a2b21ce',
        },
      ],
      version: 2,
    });
    const downloadServiceStub = DownloadService.instance;
    networkFacadeSandbox.stub(downloadServiceStub, 'downloadFile').resolves(readableContent);
    const sut = new NetworkFacade(networkMock, UploadService.instance, downloadServiceStub, CryptoService.instance);

    const chunks: Uint8Array[] = [];

    const writable = new WritableStream<Uint8Array>({
      write(chunk) {
        chunks.push(chunk);
      },
    });

    const [executeDownload] = await sut.downloadToStream(
      bucket,
      'index course habit soon assist dragon tragic helmet salute stuff later twice consider grit pulse cement obvious trick sponsor stereo hello win royal more',
      'f1858bc9675f9e4f7ab29429',
      writable,
    );

    await executeDownload;
    const fileContent = Buffer.concat(chunks);

    expect(fileContent.toString('utf-8')).to.equal('encrypted-content');
  });

  it('When a file download is aborted, should abort the download', async () => {
    const encryptedContent = Buffer.from('b6ccfa381c150f3a4b65245bffa4d84087', 'hex');
    const bucket = 'cd8abd7e8b13081660b58dbe';
    const readableContent = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(encryptedContent);
        controller.close();
      },
    });

    const networkMock = getNetworkMock();
    networkFacadeSandbox.stub(networkMock, 'getDownloadLinks').resolves({
      index: '29f07b8914d8353b663ab783f4bbe9950fdde680a69524405790cecca9c549f9',
      bucket: bucket,
      created: new Date(),
      size: 100,
      shards: [
        {
          url: 'https://doesnotexists.com/file',
          index: 0,
          size: 17,
          hash: 'a4fc32830aee362a407085f3683f20825a2b21ce',
        },
      ],
      version: 2,
    });
    const downloadServiceStub = DownloadService.instance;
    networkFacadeSandbox.stub(downloadServiceStub, 'downloadFile').resolves(readableContent);
    const sut = new NetworkFacade(networkMock, UploadService.instance, downloadServiceStub, CryptoService.instance);

    const writable = new WritableStream<Uint8Array>();

    const [executeDownload, abort] = await sut.downloadToStream(
      bucket,
      'index course habit soon assist dragon tragic helmet salute stuff later twice consider grit pulse cement obvious trick sponsor stereo hello win royal more',
      'f1858bc9675f9e4f7ab29429',
      writable,
    );

    try {
      abort.abort();
      await executeDownload;
      expect(false).to.be.true;
    } catch (error) {
      expect((error as Error).message).to.be.equal('Download aborted');
    }
  });

  it('When a file is downloaded, should report progress', async () => {
    const encryptedContent = Buffer.from('b6ccfa381c150f3a4b65245bffa4d84087', 'hex');
    const bucket = 'cd8abd7e8b13081660b58dbe';

    const readableContent = new Readable({
      read() {
        this.push(encryptedContent);
        this.push(null);
      },
    });

    const networkMock = getNetworkMock();
    networkFacadeSandbox.stub(networkMock, 'getDownloadLinks').resolves({
      index: '29f07b8914d8353b663ab783f4bbe9950fdde680a69524405790cecca9c549f9',
      bucket: bucket,
      created: new Date(),
      size: 100,
      shards: [
        {
          url: 'https://doesnotexists.com/file',
          index: 0,
          size: 17,
          hash: 'a4fc32830aee362a407085f3683f20825a2b21ce',
        },
      ],
      version: 2,
    });
    const downloadServiceStub = DownloadService.instance;

    const sut = new NetworkFacade(networkMock, UploadService.instance, downloadServiceStub, CryptoService.instance);

    const writable = new WritableStream<Uint8Array>();

    const options = { progressCallback: sinon.stub() };

    networkFacadeSandbox.stub(axios, 'get').callsFake((_, config) => {
      config?.onDownloadProgress?.({ loaded: 100, total: 100, bytes: 100 });
      return Promise.resolve({ data: readableContent });
    });
    /* networkFacadeSandbox.stub(superagent, 'get').returns({
      on: sinon.stub().withArgs('progress').yields({ total: 100, loaded: 100 }).resolves(readableContent),
    }); */

    const [executeDownload] = await sut.downloadToStream(
      bucket,
      'index course habit soon assist dragon tragic helmet salute stuff later twice consider grit pulse cement obvious trick sponsor stereo hello win royal more',
      'f1858bc9675f9e4f7ab29429',
      writable,
      options,
    );

    await executeDownload;

    expect(options.progressCallback.calledWith(1)).to.be.true;
  });
});
