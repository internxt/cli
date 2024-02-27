import { DownloadService } from '../../../src/services/network/download.service';
import sinon from 'sinon';
import superagent from 'superagent';
import { Readable } from 'stream';
import { expect } from 'chai';

describe('Download Service', () => {
  const sut = DownloadService.instance;
  const sandbox = sinon.createSandbox();

  afterEach(() => {
    sandbox.restore();
  });
  it('When a file is downloaded, should return a ReadableStream', async () => {
    const fileContent = Buffer.from('file-content');
    const readableContent = new Readable({
      read() {
        this.push(fileContent);
        this.push(null);
      },
    });

    // @ts-expect-error - Partial Superagent request mock
    sandbox.stub(superagent, 'get').returns({
      on: sandbox.stub().resolves(readableContent),
    });

    const readable = await sut.downloadFile('https://example.com/file', {});

    const reader = readable.getReader();

    const read = await reader.read();

    expect(read.value).to.deep.equal(fileContent);
  });

  it.skip('When a file is downloaded, progress should be reported', async () => {
    const fileContent = Buffer.from('file-content');
    const options = {
      progressCallback: sandbox.stub(),
    };
    const readableContent = new Readable({
      read() {
        this.push(fileContent);
        this.push(null);
      },
    });

    // @ts-expect-error - Partial Superagent request mock
    sinon.stub(superagent, 'get').returns({
      on: sinon
        .stub()
        .callsFake((event, callback) => {
          console.log('EVENT', event);
          if (event === 'progress') {
            callback({ total: 100, loaded: 50 });
          }
        })
        .callsFake((event, callback) => {
          if (event === 'progress') {
            callback({ total: 100, loaded: 100 });
          }
        })
        .resolves(readableContent),
    });

    await sut.downloadFile('https://example.com/file', options);

    expect(options.progressCallback.calledWith(0.5)).to.be.true;
    expect(options.progressCallback.calledWith(1)).to.be.true;
  });
});
