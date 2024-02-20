import sinon from 'sinon';
import axios from 'axios';
import { expect } from 'chai';
import { UploadService } from '../../../src/services/network/upload.service';

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
    const data = new Blob(['test content'], { type: 'text/plain' });
    const options = {
      progressCallback: sinon.stub(),
      abortController: new AbortController(),
    };
    sinon.stub(axios, 'put').resolves({
      headers: {},
    });

    try {
      await sut.uploadFile(url, data, options);
    } catch (error) {
      expect((error as Error).message).to.contain('Missing Etag');
    }
  });

  it('When a file is uploaded and etag is returned, the etag should be returned', async () => {
    const url = 'https://example.com/upload';
    const data = new Blob(['test content'], { type: 'text/plain' });
    const options = {
      progressCallback: sinon.stub(),
      abortController: new AbortController(),
    };
    sinon.stub(axios, 'put').resolves({
      headers: {
        etag: 'test-etag',
      },
    });

    const result = await sut.uploadFile(url, data, options);
    expect(result.etag).to.equal('test-etag');
  });

  it('When a file is uploaded, should update the progress', async () => {
    const url = 'https://example.com/upload';
    const data = new Blob(['test content'], { type: 'text/plain' });
    const options = {
      progressCallback: sinon.stub(),
      abortController: new AbortController(),
    };

    sinon.stub(axios, 'put').callsFake((_, __, config) => {
      config?.onUploadProgress?.({ loaded: 50, total: 100, bytes: 100 });

      config?.onUploadProgress?.({ loaded: 100, total: 100, bytes: 100 });

      return Promise.resolve({ headers: { etag: 'exampleEtag' } });
    });

    await sut.uploadFile(url, data, options);
    sinon.assert.calledWithMatch(options.progressCallback, 45);

    sinon.assert.calledWithExactly(options.progressCallback, 90);
    sinon.assert.calledWithExactly(options.progressCallback, 100);
  });

  it('When a file is uploaded and the upload is aborted, should cancel the request', async () => {
    const url = 'https://example.com/upload';
    const data = new Blob(['test content'], { type: 'text/plain' });
    const options = {
      progressCallback: sinon.stub(),
      abortController: new AbortController(),
    };

    const axiosPutStub = sinon.stub(axios, 'put');

    sut.uploadFile(url, data, options);

    options.abortController.abort();

    expect(axiosPutStub.called).to.be.true;
    expect(axiosPutStub.args[0][0]).to.equal(url);
  });
});
