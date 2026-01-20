import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BufferStream } from '../../src/utils/stream.utils';
import { ThumbnailService } from '../../src/services/thumbnail.service';
import path from 'node:path';
import { Readable } from 'node:stream';

describe('Thumbnail Service tests', () => {
  const testFilePath = path.join(process.cwd(), 'test/fixtures/test-content.fixture.txt');

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('createFileStreamWithBuffer', () => {
    it('should create BufferStream and pipe stream when file type is thumbnailable', () => {
      const result = ThumbnailService.instance.createFileStreamWithBuffer({ path: testFilePath, fileType: 'png' });

      expect(result.bufferStream).toBeDefined();
      expect(result.bufferStream).toBeInstanceOf(BufferStream);
      expect(result.fileStream).toBeDefined();
      expect(result.fileStream).toBeInstanceOf(Readable);
    });

    it('should not create BufferStream when file type is not thumbnailable', () => {
      const result = ThumbnailService.instance.createFileStreamWithBuffer({ path: testFilePath, fileType: 'txt' });

      expect(result.bufferStream).toBeUndefined();
      expect(result.fileStream).toBeDefined();
      expect(result.fileStream).toBeInstanceOf(Readable);
    });
  });
});
