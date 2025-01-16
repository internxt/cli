import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadService } from '../../../src/services/network/upload.service';
import nock from 'nock';
import { Readable } from 'node:stream';
import crypto from 'node:crypto';

describe('Upload Service', () => {
  const sut = UploadService.instance;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When a file is uploaded and etag is missing, should throw an error', async () => {
    const url = 'https://example.com/upload';
    const file = crypto.randomBytes(16).toString('hex');
    const data = new Readable({
      read() {
        this.push(file);
        this.push(null);
      },
    });
    const options = {
      progressCallback: vi.fn(),
      abortController: new AbortController(),
    };

    nock('https://example.com').put('/upload').reply(200, '', {});

    try {
      await sut.uploadFileToNetwork(url, data, options);
    } catch (error) {
      expect((error as Error).message).to.contain('Missing Etag');
    }
  });

  it('When a file is uploaded and etag is returned, the etag should be returned', async () => {
    const url = 'https://example.com/upload';
    const file = crypto.randomBytes(16).toString('hex');
    const data = new Readable({
      read() {
        this.push(file);
        this.push(null);
      },
    });
    const options = {
      progressCallback: vi.fn(),
      abortController: new AbortController(),
    };

    nock('https://example.com').put('/upload').reply(200, '', {
      etag: 'test-etag',
    });

    const result = await sut.uploadFileToNetwork(url, data, options);
    expect(result.etag).to.be.equal('test-etag');
  });

  it('When a file is uploaded, should update the progress', async () => {
    const url = 'https://example.com/upload';
    const file = crypto.randomBytes(16).toString('hex');
    const data = new Readable({
      read() {
        this.push(file);
        this.push(null);
      },
    });
    const options = {
      progressCallback: vi.fn(),
      abortController: new AbortController(),
    };

    nock('https://example.com').put('/upload').reply(200, '', {
      etag: 'test-etag',
    });

    await sut.uploadFileToNetwork(url, data, options);
    expect(options.progressCallback).toHaveBeenCalledWith(file.length);
  });

  it('When a file is uploaded and the upload is aborted, should cancel the request', async () => {
    /*const url = 'https://example.com/upload';
    const data = new Readable({
      read() {
        this.push('test content');
        this.push(null);
      },
    });
    const options = {
      progressCallback: vi.fn(),
      abortController: new AbortController(),
    };

    nock('https://example.com').put('/upload').reply(200, '', {
      etag: 'test-etag',
    });

    try {
      await sut.uploadFile(url, data, options);
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect((error as Error).message).to.contain('The user aborted a request');
    }*/
  });
});
