import { describe, expect, test } from 'vitest';
import { BufferStream } from '../../src/utils/stream.utils';
import { ThumbnailService } from '../../src/services/thumbnail.service';
import path from 'node:path';
import { Readable } from 'node:stream';

describe('Thumbnail Service tests', () => {
  const testFilePath = path.join(process.cwd(), 'test/fixtures/test-content.fixture.txt');

  describe('createFileStreamWithBuffer', () => {
    test('when the file has a supported image type, then a buffer stream and file stream are created', () => {
      const result = ThumbnailService.instance.createFileStreamWithBuffer({ path: testFilePath, fileType: 'png' });

      expect(result.bufferStream).toBeDefined();
      expect(result.bufferStream).toBeInstanceOf(BufferStream);
      expect(result.fileStream).toBeDefined();
      expect(result.fileStream).toBeInstanceOf(Readable);
    });

    test('when the file has an unsupported type, then only a file stream is created without buffering', () => {
      const result = ThumbnailService.instance.createFileStreamWithBuffer({ path: testFilePath, fileType: 'txt' });

      expect(result.bufferStream).toBeUndefined();
      expect(result.fileStream).toBeDefined();
      expect(result.fileStream).toBeInstanceOf(Readable);
    });
  });
});
