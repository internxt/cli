import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DownloadService } from '../../../src/services/network/download.service';
import { Readable } from 'node:stream';
import axios from 'axios';

describe('Download Service', () => {
  const sut = DownloadService.instance;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When a file is downloaded, should return a ReadableStream', async () => {
    const fileContent = Buffer.from('file-content');
    const readableContent = new Readable({
      read() {
        this.push(fileContent);
        this.push(null);
      },
    });

    vi.spyOn(axios, 'get').mockResolvedValue({ data: readableContent });
    const readable = await sut.downloadFile('https://example.com/file', {});

    const reader = readable.getReader();

    const read = await reader.read();

    expect(read.value).to.deep.equal(fileContent);
  });

  it('When a file is downloaded, progress should be reported', async () => {
    const fileContent = Buffer.from('file-content');
    const options = {
      progressCallback: vi.fn(),
    };
    const readableContent = new Readable({
      read() {
        this.push(fileContent);
        this.push(null);
      },
    });

    vi.spyOn(axios, 'get').mockImplementation((_, config) => {
      config?.onDownloadProgress?.({ loaded: 100, total: 100, bytes: 100, lengthComputable: true });
      return Promise.resolve({ data: readableContent });
    });

    await sut.downloadFile('https://example.com/file', options);

    expect(options.progressCallback).toHaveBeenCalledWith(1);
  });
});
