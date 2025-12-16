import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFileStreamWithBuffer } from '../../src/utils/thumbnail.utils';
import { BufferStream } from '../../src/utils/stream.utils';
import path from 'node:path';
import { Readable } from 'node:stream';

describe('createFileStreamWithBuffer', () => {
  const testFilePath = path.join(process.cwd(), 'test/fixtures/test-content.fixture.txt');

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('should create BufferStream and pipe stream when file type is thumbnailable', () => {
    const result = createFileStreamWithBuffer({ path: testFilePath, fileType: 'png' });

    expect(result.bufferStream).toBeDefined();
    expect(result.bufferStream).toBeInstanceOf(BufferStream);
    expect(result.fileStream).toBeDefined();
    expect(result.fileStream).toBeInstanceOf(Readable);
  });

  it('should not create BufferStream when file type is not thumbnailable', () => {
    const result = createFileStreamWithBuffer({ path: testFilePath, fileType: 'txt' });

    expect(result.bufferStream).toBeUndefined();
    expect(result.fileStream).toBeDefined();
    expect(result.fileStream).toBeInstanceOf(Readable);
  });
});
