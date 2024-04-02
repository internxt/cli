import sinon from 'sinon';
import { expect } from 'chai';
import { UploadService } from '../../../src/services/network/upload.service';
import nock from 'nock';
import { Readable } from 'stream';
describe('Upload Service', () => {
  let sut: UploadService;

  beforeEach(() => {
    sut = UploadService.instance;
  });

  afterEach(() => {
    sinon.restore();
  });

  it('When a file is uploaded and etag is missing, should throw an error', async () => {
    const url = 'https://example.com/upload';
    const data = new Readable({
      read() {
        this.push('test content');
        this.push(null);
      },
    });
    const options = {
      progressCallback: sinon.stub(),
      abortController: new AbortController(),
    };

    nock('https://example.com').put('/upload').reply(200, '', {});

    try {
      await sut.uploadFile(url, data, options);
    } catch (error) {
      expect((error as Error).message).to.contain('Missing Etag');
    }
  });

  it('When a file is uploaded and etag is returned, the etag should be returned', async () => {
    const url = 'https://example.com/upload';
    const data = new Readable({
      read() {
        this.push('test content');
        this.push(null);
      },
    });
    const options = {
      progressCallback: sinon.stub(),
      abortController: new AbortController(),
    };

    nock('https://example.com').put('/upload').reply(200, '', {
      etag: 'test-etag',
    });

    const result = await sut.uploadFile(url, data, options);
    expect(result.etag).to.equal('test-etag');
  });

  it('When a file is uploaded, should update the progress', async () => {
    const url = 'https://example.com/upload';
    const data = new Readable({
      read() {
        this.push('test content');
        this.push(null);
      },
    });
    const options = {
      progressCallback: sinon.stub(),
      abortController: new AbortController(),
    };

    nock('https://example.com').put('/upload').reply(200, '', {
      etag: 'test-etag',
    });

    await sut.uploadFile(url, data, options);
    sinon.assert.calledWithExactly(options.progressCallback, 1);
  });

  it('When a file is uploaded and the upload is aborted, should cancel the request', async () => {
    const url = 'https://example.com/upload';
    const data = new Readable({
      read() {
        this.push('test content');
        this.push(null);
      },
    });
    const options = {
      progressCallback: sinon.stub(),
      abortController: new AbortController(),
    };

    nock('https://example.com').put('/upload').reply(200, '', {
      etag: 'test-etag',
    });

    sut.uploadFile(url, data, options);

    options.abortController.abort();
  });
});
