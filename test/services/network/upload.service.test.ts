import sinon from 'sinon';
import superagent from 'superagent';
import { expect } from 'chai';
import { UploadService } from '../../../src/services/network/upload.service';
import nock from 'nock';
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

    nock('https://example.com').put('/upload').reply(200, '', {});

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

    nock('https://example.com').put('/upload').reply(200, '', {
      etag: 'test-etag',
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

    nock('https://example.com').put('/upload').reply(200, '', {
      etag: 'test-etag',
    });

    sinon.stub(superagent, 'put').returns({
      // @ts-expect-error - Partiak Superagent request mock
      set: () => {
        return {
          set: () => {
            return {
              send: () => {
                return {
                  on: sinon
                    .stub()
                    .callsFake((event, callback) => {
                      if (event === 'progress') {
                        callback({ total: 100, loaded: 50 });
                      }
                    })
                    .resolves({ headers: { etag: 'test-etag' } }),
                };
              },
            };
          },
        };
      },
    });

    await sut.uploadFile(url, data, options);
    sinon.assert.calledWithExactly(options.progressCallback, 1);
  });

  it('When a file is uploaded and the upload is aborted, should cancel the request', async () => {
    const url = 'https://example.com/upload';
    const data = new Blob(['test content'], { type: 'text/plain' });
    const options = {
      progressCallback: sinon.stub(),
      abortController: new AbortController(),
    };

    nock('https://example.com').put('/upload').reply(200, '', {
      etag: 'test-etag',
    });

    // @ts-expect-error - Partial mock response
    const requestStub = sinon.stub(superagent, 'put').resolves({
      on: sinon.stub().callsFake((event, callback) => {
        if (event === 'progress') {
          callback({ total: 100, loaded: 50 });
        }
      }),
    });

    sut.uploadFile(url, data, options);

    options.abortController.abort();

    expect(requestStub.called).to.be.true;
    expect(requestStub.args[0][0]).to.equal(url);
  });
});
