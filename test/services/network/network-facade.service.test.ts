import { describe, expect, test, vi } from 'vitest';
import { NetworkFacade } from '../../../src/services/network/network-facade.service';
import { SdkManager } from '../../../src/services/sdk-manager.service';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { DownloadService } from '../../../src/services/network/download.service';
import { Readable } from 'node:stream';
import axios from 'axios';
import { fail } from 'node:assert';
import { Environment } from '@internxt/inxt-js';
import { ConfigService } from '../../../src/services/config.service';
import { UserFixture } from '../../fixtures/auth.fixture';
import { UsageService } from '../../../src/services/usage.service';

describe('Network Facade Service', () => {
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

  test('when a file is uploaded, then the upload functionality is called', async () => {
    const mockEnvironment = {
      upload: vi.fn(),
    };
    const sut = new NetworkFacade(
      getNetworkMock(),
      // @ts-expect-error - We only mock the properties we need
      mockEnvironment,
    );
    const file = path.join(process.cwd(), 'test/fixtures/test-content.fixture.txt');
    const readStream = createReadStream(file);

    const progressCallback = vi.fn();

    vi.spyOn(UsageService.instance, 'fetchLimits').mockResolvedValue({
      maxUploadFileSize: null,
      versioning: { enabled: false, maxFileSize: 0, retentionDays: 0, maxVersions: 0 },
    });

    await sut.uploadFile({
      from: readStream,
      size: 100,
      bucketId: 'f1858bc9675f9e4f7ab29429',
      progressCallback,
    });

    expect(mockEnvironment.upload).toHaveBeenCalledOnce();
  });

  test('when a file exceeds the account upload size limit, then an error is thrown', async () => {
    const mockEnvironment = {
      upload: vi.fn(),
    };
    const sut = new NetworkFacade(
      getNetworkMock(),
      // @ts-expect-error - We only mock the properties we need
      mockEnvironment,
    );
    const readStream = createReadStream(path.join(process.cwd(), 'test/fixtures/test-content.fixture.txt'));

    vi.spyOn(UsageService.instance, 'fetchLimits').mockResolvedValue({
      maxUploadFileSize: 1024 * 1024,
      versioning: { enabled: false, maxFileSize: 0, retentionDays: 0, maxVersions: 0 },
    });

    await expect(() =>
      sut.uploadFile({
        from: readStream,
        size: 2 * 1024 * 1024,
        bucketId: 'bucket-id',
        progressCallback: vi.fn(),
      }),
    ).rejects.toThrow('File is too big (2 MB exceeds account upload limit of 1 MB)');

    expect(mockEnvironment.upload).not.toHaveBeenCalled();
  });

  test('when a file exceeds the maximum allowed size, then an error is thrown', async () => {
    const mockEnvironment = {
      upload: vi.fn(),
    };
    const sut = new NetworkFacade(
      getNetworkMock(),
      // @ts-expect-error - We only mock the properties we need
      mockEnvironment,
    );
    const readStream = createReadStream(path.join(process.cwd(), 'test/fixtures/test-content.fixture.txt'));

    vi.spyOn(UsageService.instance, 'fetchLimits').mockResolvedValue({
      maxUploadFileSize: null,
      versioning: { enabled: false, maxFileSize: 0, retentionDays: 0, maxVersions: 0 },
    });

    await expect(() =>
      sut.uploadFile({
        from: readStream,
        size: 101 * 1024 * 1024 * 1024,
        bucketId: 'bucket-id',
        progressCallback: vi.fn(),
      }),
    ).rejects.toThrow('File is too big (more than 100 GB)');

    expect(mockEnvironment.upload).not.toHaveBeenCalled();
  });

  test('when the account limit is stricter than the maximum allowed size, then the account limit is enforced', async () => {
    const mockEnvironment = {
      upload: vi.fn(),
    };
    const sut = new NetworkFacade(
      getNetworkMock(),
      // @ts-expect-error - We only mock the properties we need
      mockEnvironment,
    );
    const readStream = createReadStream(path.join(process.cwd(), 'test/fixtures/test-content.fixture.txt'));

    vi.spyOn(UsageService.instance, 'fetchLimits').mockResolvedValue({
      maxUploadFileSize: 1024 * 1024 * 1024,
      versioning: { enabled: false, maxFileSize: 0, retentionDays: 0, maxVersions: 0 },
    });

    await expect(() =>
      sut.uploadFile({
        from: readStream,
        size: 5 * 1024 * 1024 * 1024,
        bucketId: 'bucket-id',
        progressCallback: vi.fn(),
      }),
    ).rejects.toThrow('5 GB exceeds account upload limit of 1 GB');

    expect(mockEnvironment.upload).not.toHaveBeenCalled();
  });

  test('when a file is within the allowed size limit, then the upload proceeds', async () => {
    const mockEnvironment = {
      upload: vi.fn(),
    };
    const sut = new NetworkFacade(
      getNetworkMock(),
      // @ts-expect-error - We only mock the properties we need
      mockEnvironment,
    );
    const readStream = createReadStream(path.join(process.cwd(), 'test/fixtures/test-content.fixture.txt'));

    vi.spyOn(UsageService.instance, 'fetchLimits').mockResolvedValue({
      maxUploadFileSize: 100 * 1024 * 1024,
      versioning: { enabled: false, maxFileSize: 0, retentionDays: 0, maxVersions: 0 },
    });

    await sut.uploadFile({
      from: readStream,
      size: 1024,
      bucketId: 'bucket-id',
      progressCallback: vi.fn(),
    });

    expect(mockEnvironment.upload).toHaveBeenCalledOnce();
  });

  test('when a file is downloaded, then it is written to a stream', async () => {
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
    vi.spyOn(DownloadService.instance, 'downloadFile').mockResolvedValue(readableContent);
    const sut = new NetworkFacade(networkMock, getEnvironmentMock());

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
      encryptedContent.length,
      writable,
    );

    await executeDownload;
    const fileContent = Buffer.concat(chunks);

    expect(fileContent.toString('utf-8')).to.be.equal('encrypted-content');
  });

  test('when the download is aborted, then the operation is cancelled', async () => {
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
    vi.spyOn(DownloadService.instance, 'downloadFile').mockResolvedValue(readableContent);
    const sut = new NetworkFacade(networkMock, getEnvironmentMock());

    const writable = new WritableStream<Uint8Array>();

    const [executeDownload, abort] = await sut.downloadToStream(
      bucket,
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

  test('when a file is downloaded, then download progress is reported', async () => {
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

    const sut = new NetworkFacade(networkMock, getEnvironmentMock());

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
