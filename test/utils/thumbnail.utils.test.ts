import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  createFileStreamWithBuffer,
  isFileThumbnailable,
  isImageThumbnailable,
  isPDFThumbnailable,
} from '../../src/utils/thumbnail.utils';
import { BufferStream } from '../../src/utils/stream.utils';
import path from 'node:path';
import { Readable } from 'node:stream';

describe('Thumbnail Utils tests', () => {
  const testFilePath = path.join(process.cwd(), 'test/fixtures/test-content.fixture.txt');

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('createFileStreamWithBuffer', () => {
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

  describe('isFileThumbnailable', () => {
    it('should return true for valid image extensions', () => {
      expect(isFileThumbnailable('jpg')).toBe(true);
      expect(isFileThumbnailable('jpeg')).toBe(true);
      expect(isFileThumbnailable('png')).toBe(true);
      expect(isFileThumbnailable('webp')).toBe(true);
      expect(isFileThumbnailable('gif')).toBe(true);
      expect(isFileThumbnailable('tif')).toBe(true);
      expect(isFileThumbnailable('tiff')).toBe(true);
    });

    it('should return true regardless of case', () => {
      expect(isFileThumbnailable('JPG')).toBe(true);
      expect(isFileThumbnailable('PNG')).toBe(true);
      expect(isFileThumbnailable('Webp')).toBe(true);
      expect(isFileThumbnailable('GIF')).toBe(true);
    });

    it('should handle whitespace correctly', () => {
      expect(isFileThumbnailable(' jpg ')).toBe(true);
      expect(isFileThumbnailable('  png  ')).toBe(true);
      expect(isFileThumbnailable('\tgif\t')).toBe(true);
    });

    it('should return false for non-thumbnailable extensions', () => {
      expect(isFileThumbnailable('pdf')).toBe(false);
      expect(isFileThumbnailable('doc')).toBe(false);
      expect(isFileThumbnailable('txt')).toBe(false);
      expect(isFileThumbnailable('mp4')).toBe(false);
      expect(isFileThumbnailable('bmp')).toBe(false);
      expect(isFileThumbnailable('raw')).toBe(false);
      expect(isFileThumbnailable('heic')).toBe(false);
    });

    it('should return false for empty strings', () => {
      expect(isFileThumbnailable('')).toBe(false);
      expect(isFileThumbnailable('   ')).toBe(false);
      expect(isFileThumbnailable('\t\n')).toBe(false);
    });

    it('should return false for invalid input', () => {
      expect(isFileThumbnailable('unknown')).toBe(false);
      expect(isFileThumbnailable('jpgg')).toBe(false);
    });
  });

  describe('isPDFThumbnailable', () => {
    it('should return true for pdf extension', () => {
      expect(isPDFThumbnailable('pdf')).toBe(true);
    });

    it('should return true regardless of case', () => {
      expect(isPDFThumbnailable('PDF')).toBe(true);
      expect(isPDFThumbnailable('Pdf')).toBe(true);
      expect(isPDFThumbnailable('pDf')).toBe(true);
    });

    it('should handle whitespace correctly', () => {
      expect(isPDFThumbnailable(' pdf ')).toBe(true);
      expect(isPDFThumbnailable('  PDF  ')).toBe(true);
      expect(isPDFThumbnailable('\tpdf\n')).toBe(true);
    });

    it('should return false for non-pdf extensions', () => {
      expect(isPDFThumbnailable('jpg')).toBe(false);
      expect(isPDFThumbnailable('png')).toBe(false);
      expect(isPDFThumbnailable('doc')).toBe(false);
      expect(isPDFThumbnailable('docx')).toBe(false);
      expect(isPDFThumbnailable('txt')).toBe(false);
    });

    it('should return false for empty strings', () => {
      expect(isPDFThumbnailable('')).toBe(false);
      expect(isPDFThumbnailable('   ')).toBe(false);
      expect(isPDFThumbnailable('\t\n')).toBe(false);
    });

    it('should return false for invalid input', () => {
      expect(isPDFThumbnailable('pdff')).toBe(false);
      expect(isPDFThumbnailable('pd')).toBe(false);
    });
  });

  describe('isImageThumbnailable', () => {
    it('should return true for all thumbnailable image extensions', () => {
      expect(isImageThumbnailable('jpg')).toBe(true);
      expect(isImageThumbnailable('jpeg')).toBe(true);
      expect(isImageThumbnailable('png')).toBe(true);
      expect(isImageThumbnailable('webp')).toBe(true);
      expect(isImageThumbnailable('gif')).toBe(true);
      expect(isImageThumbnailable('tif')).toBe(true);
      expect(isImageThumbnailable('tiff')).toBe(true);
    });

    it('should return true regardless of case', () => {
      expect(isImageThumbnailable('JPG')).toBe(true);
      expect(isImageThumbnailable('PNG')).toBe(true);
      expect(isImageThumbnailable('GIF')).toBe(true);
      expect(isImageThumbnailable('Jpeg')).toBe(true);
    });

    it('should handle whitespace correctly', () => {
      expect(isImageThumbnailable(' jpg ')).toBe(true);
      expect(isImageThumbnailable('  png  ')).toBe(true);
      expect(isImageThumbnailable('\twebp\n')).toBe(true);
    });

    it('should return false for non-thumbnailable image formats', () => {
      expect(isImageThumbnailable('bmp')).toBe(false);
      expect(isImageThumbnailable('heic')).toBe(false);
      expect(isImageThumbnailable('raw')).toBe(false);
      expect(isImageThumbnailable('cr2')).toBe(false);
      expect(isImageThumbnailable('nef')).toBe(false);
      expect(isImageThumbnailable('eps')).toBe(false);
    });

    it('should return false for non-image extensions', () => {
      expect(isImageThumbnailable('pdf')).toBe(false);
      expect(isImageThumbnailable('doc')).toBe(false);
      expect(isImageThumbnailable('txt')).toBe(false);
      expect(isImageThumbnailable('mp4')).toBe(false);
      expect(isImageThumbnailable('mp3')).toBe(false);
    });

    it('should return false for empty strings', () => {
      expect(isImageThumbnailable('')).toBe(false);
      expect(isImageThumbnailable('   ')).toBe(false);
      expect(isImageThumbnailable('\t\n')).toBe(false);
    });

    it('should return false for invalid input', () => {
      expect(isImageThumbnailable('jpgg')).toBe(false);
      expect(isImageThumbnailable('unknown')).toBe(false);
    });
  });
});
