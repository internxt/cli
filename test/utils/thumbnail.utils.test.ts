import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThumbnailUtils } from '../../src/utils/thumbnail.utils';

describe('Thumbnail Utils tests', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('isFileThumbnailable', () => {
    it('should return true for valid image extensions', () => {
      expect(ThumbnailUtils.isFileThumbnailable('jpg')).toBe(true);
      expect(ThumbnailUtils.isFileThumbnailable('jpeg')).toBe(true);
      expect(ThumbnailUtils.isFileThumbnailable('png')).toBe(true);
      expect(ThumbnailUtils.isFileThumbnailable('webp')).toBe(true);
      expect(ThumbnailUtils.isFileThumbnailable('gif')).toBe(true);
      expect(ThumbnailUtils.isFileThumbnailable('tif')).toBe(true);
      expect(ThumbnailUtils.isFileThumbnailable('tiff')).toBe(true);
    });

    it('should return true regardless of case', () => {
      expect(ThumbnailUtils.isFileThumbnailable('JPG')).toBe(true);
      expect(ThumbnailUtils.isFileThumbnailable('PNG')).toBe(true);
      expect(ThumbnailUtils.isFileThumbnailable('Webp')).toBe(true);
      expect(ThumbnailUtils.isFileThumbnailable('GIF')).toBe(true);
    });

    it('should handle whitespace correctly', () => {
      expect(ThumbnailUtils.isFileThumbnailable(' jpg ')).toBe(true);
      expect(ThumbnailUtils.isFileThumbnailable('  png  ')).toBe(true);
      expect(ThumbnailUtils.isFileThumbnailable('\tgif\t')).toBe(true);
    });

    it('should return false for non-thumbnailable extensions', () => {
      expect(ThumbnailUtils.isFileThumbnailable('pdf')).toBe(false);
      expect(ThumbnailUtils.isFileThumbnailable('doc')).toBe(false);
      expect(ThumbnailUtils.isFileThumbnailable('txt')).toBe(false);
      expect(ThumbnailUtils.isFileThumbnailable('mp4')).toBe(false);
      expect(ThumbnailUtils.isFileThumbnailable('bmp')).toBe(false);
      expect(ThumbnailUtils.isFileThumbnailable('raw')).toBe(false);
      expect(ThumbnailUtils.isFileThumbnailable('heic')).toBe(false);
    });

    it('should return false for empty strings', () => {
      expect(ThumbnailUtils.isFileThumbnailable('')).toBe(false);
      expect(ThumbnailUtils.isFileThumbnailable('   ')).toBe(false);
      expect(ThumbnailUtils.isFileThumbnailable('\t\n')).toBe(false);
    });

    it('should return false for invalid input', () => {
      expect(ThumbnailUtils.isFileThumbnailable('unknown')).toBe(false);
      expect(ThumbnailUtils.isFileThumbnailable('jpgg')).toBe(false);
    });
  });

  describe('isPDFThumbnailable', () => {
    it('should return true for pdf extension', () => {
      expect(ThumbnailUtils.isPDFThumbnailable('pdf')).toBe(true);
    });

    it('should return true regardless of case', () => {
      expect(ThumbnailUtils.isPDFThumbnailable('PDF')).toBe(true);
      expect(ThumbnailUtils.isPDFThumbnailable('Pdf')).toBe(true);
      expect(ThumbnailUtils.isPDFThumbnailable('pDf')).toBe(true);
    });

    it('should handle whitespace correctly', () => {
      expect(ThumbnailUtils.isPDFThumbnailable(' pdf ')).toBe(true);
      expect(ThumbnailUtils.isPDFThumbnailable('  PDF  ')).toBe(true);
      expect(ThumbnailUtils.isPDFThumbnailable('\tpdf\n')).toBe(true);
    });

    it('should return false for non-pdf extensions', () => {
      expect(ThumbnailUtils.isPDFThumbnailable('jpg')).toBe(false);
      expect(ThumbnailUtils.isPDFThumbnailable('png')).toBe(false);
      expect(ThumbnailUtils.isPDFThumbnailable('doc')).toBe(false);
      expect(ThumbnailUtils.isPDFThumbnailable('docx')).toBe(false);
      expect(ThumbnailUtils.isPDFThumbnailable('txt')).toBe(false);
    });

    it('should return false for empty strings', () => {
      expect(ThumbnailUtils.isPDFThumbnailable('')).toBe(false);
      expect(ThumbnailUtils.isPDFThumbnailable('   ')).toBe(false);
      expect(ThumbnailUtils.isPDFThumbnailable('\t\n')).toBe(false);
    });

    it('should return false for invalid input', () => {
      expect(ThumbnailUtils.isPDFThumbnailable('pdff')).toBe(false);
      expect(ThumbnailUtils.isPDFThumbnailable('pd')).toBe(false);
    });
  });

  describe('isImageThumbnailable', () => {
    it('should return true for all thumbnailable image extensions', () => {
      expect(ThumbnailUtils.isImageThumbnailable('jpg')).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('jpeg')).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('png')).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('webp')).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('gif')).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('tif')).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('tiff')).toBe(true);
    });

    it('should return true regardless of case', () => {
      expect(ThumbnailUtils.isImageThumbnailable('JPG')).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('PNG')).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('GIF')).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('Jpeg')).toBe(true);
    });

    it('should handle whitespace correctly', () => {
      expect(ThumbnailUtils.isImageThumbnailable(' jpg ')).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('  png  ')).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('\twebp\n')).toBe(true);
    });

    it('should return false for non-thumbnailable image formats', () => {
      expect(ThumbnailUtils.isImageThumbnailable('bmp')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('heic')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('raw')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('cr2')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('nef')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('eps')).toBe(false);
    });

    it('should return false for non-image extensions', () => {
      expect(ThumbnailUtils.isImageThumbnailable('pdf')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('doc')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('txt')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('mp4')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('mp3')).toBe(false);
    });

    it('should return false for empty strings', () => {
      expect(ThumbnailUtils.isImageThumbnailable('')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('   ')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('\t\n')).toBe(false);
    });

    it('should return false for invalid input', () => {
      expect(ThumbnailUtils.isImageThumbnailable('jpgg')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('unknown')).toBe(false);
    });
  });
});
