import { DownloadService } from '../../../src/services/network/download.service';
import sinon from 'sinon';
import { Readable } from 'stream';
import { expect } from 'chai';
import axios from 'axios';

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

    sandbox.stub(axios, 'get').resolves({ data: readableContent });
    const readable = await sut.downloadFile('https://example.com/file', {});

    const reader = readable.getReader();

    const read = await reader.read();

    expect(read.value).to.deep.equal(fileContent);
  });

  it('When a file is downloaded, progress should be reported', async () => {
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

    sandbox.stub(axios, 'get').callsFake((_, config) => {
      config?.onDownloadProgress?.({ loaded: 100, total: 100, bytes: 100 });
      return Promise.resolve({ data: readableContent });
    });

    await sut.downloadFile('https://example.com/file', options);

    expect(options.progressCallback.calledWith(1)).to.be.true;
  });
});
