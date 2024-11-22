import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as NetworkUpload from '@internxt/sdk/dist/network/upload';
import { NetworkFacade } from '../../../src/services/network/network-facade.service';
import { SdkManager } from '../../../src/services/sdk-manager.service';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { UploadService } from '../../../src/services/network/upload.service';
import { CryptoService } from '../../../src/services/crypto.service';
import { DownloadService } from '../../../src/services/network/download.service';
import { Readable } from 'node:stream';
import axios from 'axios';
import { fail } from 'node:assert';

describe('Network Facade Service', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
      progressCallback: vi.fn(),
      abortController: new AbortController(),
    };

    const result = await sut.uploadFromStream(
      'f1858bc9675f9e4f7ab29429',
      'animal fog wink trade december thumb sight cousin crunch plunge captain enforce letter creek text',
      100,
      readStream,
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
      progressCallback: vi.fn(),
      abortController: new AbortController(),
    };

    vi.spyOn(NetworkUpload, 'uploadFile').mockResolvedValue('uploaded_file_id');
    const [executeUpload] = await sut.uploadFromStream(
      'f1858bc9675f9e4f7ab29429',
      'animal fog wink trade december thumb sight cousin crunch plunge captain enforce letter creek text',
      100,
      readStream,
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
    vi.spyOn(networkMock, 'getDownloadLinks').mockResolvedValue({
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
    vi.spyOn(downloadServiceStub, 'downloadFile').mockResolvedValue(readableContent);
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

    expect(fileContent.toString('utf-8')).to.be.equal('encrypted-content');
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
    vi.spyOn(networkMock, 'getDownloadLinks').mockResolvedValue({
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
    vi.spyOn(downloadServiceStub, 'downloadFile').mockResolvedValue(readableContent);
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
      fail('Expected function to throw an error, but it did not.');
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
    vi.spyOn(networkMock, 'getDownloadLinks').mockResolvedValue({
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

    const options = { progressCallback: vi.fn() };

    vi.spyOn(axios, 'get').mockImplementation((_, config) => {
      config?.onDownloadProgress?.({ loaded: 100, total: 100, bytes: 100, lengthComputable: true });
      return Promise.resolve({ data: readableContent });
    });

    const [executeDownload] = await sut.downloadToStream(
      bucket,
      'index course habit soon assist dragon tragic helmet salute stuff later twice consider grit pulse cement obvious trick sponsor stereo hello win royal more',
      'f1858bc9675f9e4f7ab29429',
      writable,
      options,
    );

    await executeDownload;

    expect(options.progressCallback).toHaveBeenCalledWith(1);
  });
});
