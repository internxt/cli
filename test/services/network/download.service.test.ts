import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DownloadService } from '../../../src/services/network/download.service';
import { Readable } from 'node:stream';
import axios from 'axios';
import Chance from 'chance';

describe('Download Service', () => {
  const sut = DownloadService.instance;
  const randomDataGenerator = new Chance();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When a file is downloaded, should return a ReadableStream', async () => {
    const fileContent = Buffer.from(randomDataGenerator.string({ length: 64 }));
    const readableContent = new Readable({
      read() {
        this.push(fileContent);
        this.push(null);
      },
    });

    vi.spyOn(axios, 'get').mockResolvedValue({ data: readableContent });
    const readable = await sut.downloadFile('https://example.com/file', fileContent.length, {});

    const reader = readable.getReader();

    const read = await reader.read();

    expect(read.value).to.deep.equal(fileContent);
  });

  it('When a file is downloaded, progress should be reported', async () => {
    const fileContent = Buffer.from(randomDataGenerator.string({ length: 64 }));
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
      config?.onDownloadProgress?.({
        loaded: fileContent.length,
        total: fileContent.length,
        bytes: fileContent.length,
        lengthComputable: true,
      });
      return Promise.resolve({ data: readableContent });
    });

    await sut.downloadFile('https://example.com/file', fileContent.length, options);

    expect(options.progressCallback).toHaveBeenCalledWith(100);
  });
});
