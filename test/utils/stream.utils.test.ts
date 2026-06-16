import { describe, expect, test, vi } from 'vitest';
import { StreamUtils } from '../../src/utils/stream.utils';
import { createReadStream, readFileSync, WriteStream } from 'node:fs';
import path from 'node:path';

describe('Stream utils', () => {
  const fileWithContent = path.join(process.cwd(), 'test/fixtures/test-content.fixture.txt');

  test('when a readable Node stream is given, then a web ReadableStream is returned', async () => {
    const content = readFileSync(fileWithContent, 'utf-8');

    const readStream = createReadStream(fileWithContent);
    const readable = StreamUtils.readStreamToReadableStream(readStream);

    readStream.emit('data', content);
    const reader = readable.getReader();
    const read = await reader.read();

    expect(Buffer.from(read.value as Uint8Array).toString('utf-8')).to.be.equal(content);
  });

  test('when a writable Node stream is given, then a web WritableStream is returned', async () => {
    const writeStub = vi.fn();
    // @ts-expect-error - We only mock the properties we need
    const writeStream: WriteStream = {
      write: writeStub,
    };

    const writableStream = StreamUtils.writeStreamToWritableStream(writeStream);

    const chunk1 = new Uint8Array([1, 2, 3]);
    const chunk2 = new Uint8Array([4, 5, 6]);

    const writer = writableStream.getWriter();
    await writer.write(chunk1);
    await writer.write(chunk2);

    expect(writeStub).toHaveBeenCalledWith(chunk1);
    expect(writeStub).toHaveBeenCalledWith(chunk2);
    expect(writeStub).toHaveBeenCalledTimes(2);
  });
});
