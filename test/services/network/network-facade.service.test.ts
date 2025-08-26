import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkFacade } from '../../../src/services/network/network-facade.service';
import { SdkManager } from '../../../src/services/sdk-manager.service';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { CryptoService } from '../../../src/services/crypto.service';
import { DownloadService } from '../../../src/services/network/download.service';
import { Readable } from 'node:stream';
import axios from 'axios';
import { fail } from 'node:assert';
import { Environment } from '@internxt/inxt-js';
import { ConfigService } from '../../../src/services/config.service';
import { UserFixture } from '../../fixtures/auth.fixture';

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

  const getEnvironmentMock = () => {
    return new Environment({
      bridgeUser: 'user',
      bridgePass: 'pass',
      bridgeUrl: ConfigService.instance.get('NETWORK_URL'),
      encryptionKey: UserFixture.mnemonic,
      appDetails: SdkManager.getAppDetails(),
    });
  };

  it('When a file is uploaded, then it should call the inxt-js upload functionality', async () => {
    const mockEnvironment = {
      upload: vi.fn(),
      uploadMultipartFile: vi.fn(),
    };
    const sut = new NetworkFacade(
      getNetworkMock(),
      // @ts-expect-error - We only mock the properties we need
      mockEnvironment,
      DownloadService.instance,
      CryptoService.instance,
    );
    const file = path.join(process.cwd(), 'test/fixtures/test-content.fixture.txt');
    const readStream = createReadStream(file);

    const finishedCallback = vi.fn();
    const progressCallback = vi.fn();

    sut.uploadFile(readStream, 100, 'f1858bc9675f9e4f7ab29429', finishedCallback, progressCallback);

    expect(mockEnvironment.upload).toHaveBeenCalledOnce();
    expect(mockEnvironment.uploadMultipartFile).not.toHaveBeenCalled();
  });

  it('When a file is uploaded via multipart, then it should call the inxt-js upload multipart', async () => {
    const mockEnvironment = {
      upload: vi.fn(),
      uploadMultipartFile: vi.fn(),
    };

    const sut = new NetworkFacade(
      getNetworkMock(),
      // @ts-expect-error - We only mock the properties we need
      mockEnvironment,
      DownloadService.instance,
      CryptoService.instance,
    );
    const file = path.join(process.cwd(), 'test/fixtures/test-content.fixture.txt');
    const readStream = createReadStream(file);

    const finishedCallback = vi.fn();
    const progressCallback = vi.fn();

    sut.uploadFile(readStream, 101 * 1024 * 1024, 'f1858bc9675f9e4f7ab29429', finishedCallback, progressCallback);

    expect(mockEnvironment.uploadMultipartFile).toHaveBeenCalledOnce();
    expect(mockEnvironment.upload).not.toHaveBeenCalled();
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
    const sut = new NetworkFacade(networkMock, getEnvironmentMock(), downloadServiceStub, CryptoService.instance);

    const chunks: Uint8Array[] = [];

    const writable = new WritableStream<Uint8Array>({
      write(chunk) {
        chunks.push(chunk);
      },
    });

    const [executeDownload] = await sut.downloadToStream(
      bucket,
      // eslint-disable-next-line max-len
      'index course habit soon assist dragon tragic helmet salute stuff later twice consider grit pulse cement obvious trick sponsor stereo hello win royal more',
      'f1858bc9675f9e4f7ab29429',
      encryptedContent.length,
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
    const sut = new NetworkFacade(networkMock, getEnvironmentMock(), downloadServiceStub, CryptoService.instance);

    const writable = new WritableStream<Uint8Array>();

    const [executeDownload, abort] = await sut.downloadToStream(
      bucket,
      // eslint-disable-next-line max-len
      'index course habit soon assist dragon tragic helmet salute stuff later twice consider grit pulse cement obvious trick sponsor stereo hello win royal more',
      'f1858bc9675f9e4f7ab29429',
      encryptedContent.length,
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

    const sut = new NetworkFacade(networkMock, getEnvironmentMock(), downloadServiceStub, CryptoService.instance);

    const writable = new WritableStream<Uint8Array>();

    const options = { progressCallback: vi.fn() };

    vi.spyOn(axios, 'get').mockImplementation((_, config) => {
      config?.onDownloadProgress?.({
        loaded: encryptedContent.length,
        total: encryptedContent.length,
        bytes: encryptedContent.length,
        lengthComputable: true,
      });
      return Promise.resolve({ data: readableContent });
    });

    const [executeDownload] = await sut.downloadToStream(
      bucket,
      // eslint-disable-next-line max-len
      'index course habit soon assist dragon tragic helmet salute stuff later twice consider grit pulse cement obvious trick sponsor stereo hello win royal more',
      'f1858bc9675f9e4f7ab29429',
      encryptedContent.length,
      writable,
      undefined,
      options,
    );

    await executeDownload;

    expect(options.progressCallback).toHaveBeenCalledWith(100);
  });
});
