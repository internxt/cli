import { expect } from 'chai';
import { StreamUtils } from '../../src/utils/stream.utils';
import { createReadStream, createWriteStream, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import sinon from 'sinon';

describe('Stream utils', () => {
  const fileWithContent = path.join(process.cwd(), 'test/fixtures/test-content.fixture.txt');
  const fileToWrite = path.join(process.cwd(), 'test/fixtures/test-writable.fixture.txt');
  afterEach(() => {
    writeFileSync(fileToWrite, '');
  });
  it('When a ReadStream is given, should return a ReadableStream', async () => {
    const content = readFileSync(fileWithContent, 'utf-8');

    const readStream = createReadStream(fileWithContent);
    const readable = StreamUtils.readStreamToReadableStream(readStream);

    readStream.emit('data', content);
    const reader = readable.getReader();
    const read = await reader.read();

    expect(Buffer.from(read.value as Uint8Array).toString('utf-8')).to.equal(content);
  });

  it('When a WriteStream is given, should return a WritableStream', async () => {
    const writeStream = createWriteStream(fileToWrite);

    const writeStub = sinon.stub(writeStream, 'write');

    const writableStream = StreamUtils.writeStreamToWritableStream(writeStream);

    const chunk1 = new Uint8Array([1, 2, 3]);
    const chunk2 = new Uint8Array([4, 5, 6]);

    const writer = writableStream.getWriter();
    await writer.write(chunk1);
    await writer.write(chunk2);

    expect(writeStub).to.have.been.calledWith(chunk1);
    expect(writeStub).to.have.been.calledWith(chunk2);
    expect(writeStub).to.have.been.calledTwice;

    writeStub.restore();
  });
});
