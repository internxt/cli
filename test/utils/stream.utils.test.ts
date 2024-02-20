import { expect } from 'chai';
import { StreamUtils } from '../../src/utils/stream.utils';
import { createReadStream, readFileSync } from 'fs';
import path from 'path';

describe('Stream utils', () => {
  it('When a ReadStream is given, should return a ReadableStream', async () => {
    const file = path.join(process.cwd(), 'test/fixtures/test-content.fixture.txt');
    const content = readFileSync(file, 'utf-8');

    const readStream = createReadStream(file);
    const readable = StreamUtils.readStreamToReadableStream(readStream);

    readStream.emit('data', content);
    const reader = readable.getReader();
    const read = await reader.read();

    expect(Buffer.from(read.value as Uint8Array).toString('utf-8')).to.equal(content);
  });
});
