import { describe, expect, test } from 'vitest';
import { ThumbnailUtils } from '../../src/utils/thumbnail.utils';

describe('Thumbnail Utils tests', () => {
  describe('isFileThumbnailable', () => {
    test('when a valid image extension is given, then true is returned', () => {
      expect(ThumbnailUtils.isFileThumbnailable('jpg')).toBe(true);
      expect(ThumbnailUtils.isFileThumbnailable('jpeg')).toBe(true);
      expect(ThumbnailUtils.isFileThumbnailable('png')).toBe(true);
      expect(ThumbnailUtils.isFileThumbnailable('webp')).toBe(true);
      expect(ThumbnailUtils.isFileThumbnailable('gif')).toBe(true);
      expect(ThumbnailUtils.isFileThumbnailable('tif')).toBe(true);
      expect(ThumbnailUtils.isFileThumbnailable('tiff')).toBe(true);
    });

    test('when an extension has mixed case, then true is returned', () => {
      expect(ThumbnailUtils.isFileThumbnailable('JPG')).toBe(true);
      expect(ThumbnailUtils.isFileThumbnailable('PNG')).toBe(true);
      expect(ThumbnailUtils.isFileThumbnailable('Webp')).toBe(true);
      expect(ThumbnailUtils.isFileThumbnailable('GIF')).toBe(true);
    });

    test('when an extension has surrounding whitespace, then true is returned', () => {
      expect(ThumbnailUtils.isFileThumbnailable(' jpg ')).toBe(true);
      expect(ThumbnailUtils.isFileThumbnailable('  png  ')).toBe(true);
      expect(ThumbnailUtils.isFileThumbnailable('\tgif\t')).toBe(true);
    });

    test('when a non-thumbnailable extension is given, then false is returned', () => {
      expect(ThumbnailUtils.isFileThumbnailable('pdf')).toBe(false);
      expect(ThumbnailUtils.isFileThumbnailable('doc')).toBe(false);
      expect(ThumbnailUtils.isFileThumbnailable('txt')).toBe(false);
      expect(ThumbnailUtils.isFileThumbnailable('mp4')).toBe(false);
      expect(ThumbnailUtils.isFileThumbnailable('bmp')).toBe(false);
      expect(ThumbnailUtils.isFileThumbnailable('raw')).toBe(false);
      expect(ThumbnailUtils.isFileThumbnailable('heic')).toBe(false);
    });

    test('when an empty or blank string is given, then false is returned', () => {
      expect(ThumbnailUtils.isFileThumbnailable('')).toBe(false);
      expect(ThumbnailUtils.isFileThumbnailable('   ')).toBe(false);
      expect(ThumbnailUtils.isFileThumbnailable('\t\n')).toBe(false);
    });

    test('when an invalid extension is given, then false is returned', () => {
      expect(ThumbnailUtils.isFileThumbnailable('unknown')).toBe(false);
      expect(ThumbnailUtils.isFileThumbnailable('jpgg')).toBe(false);
    });
  });

  describe('isPDFThumbnailable', () => {
    test('when a pdf extension is given, then true is returned', () => {
      expect(ThumbnailUtils.isPDFThumbnailable('pdf')).toBe(true);
    });

    test('when an extension has mixed case, then true is returned', () => {
      expect(ThumbnailUtils.isPDFThumbnailable('PDF')).toBe(true);
      expect(ThumbnailUtils.isPDFThumbnailable('Pdf')).toBe(true);
      expect(ThumbnailUtils.isPDFThumbnailable('pDf')).toBe(true);
    });

    test('when an extension has surrounding whitespace, then true is returned', () => {
      expect(ThumbnailUtils.isPDFThumbnailable(' pdf ')).toBe(true);
      expect(ThumbnailUtils.isPDFThumbnailable('  PDF  ')).toBe(true);
      expect(ThumbnailUtils.isPDFThumbnailable('\tpdf\n')).toBe(true);
    });

    test('when a non-pdf extension is given, then false is returned', () => {
      expect(ThumbnailUtils.isPDFThumbnailable('jpg')).toBe(false);
      expect(ThumbnailUtils.isPDFThumbnailable('png')).toBe(false);
      expect(ThumbnailUtils.isPDFThumbnailable('doc')).toBe(false);
      expect(ThumbnailUtils.isPDFThumbnailable('docx')).toBe(false);
      expect(ThumbnailUtils.isPDFThumbnailable('txt')).toBe(false);
    });

    test('when an empty or blank string is given, then false is returned', () => {
      expect(ThumbnailUtils.isPDFThumbnailable('')).toBe(false);
      expect(ThumbnailUtils.isPDFThumbnailable('   ')).toBe(false);
      expect(ThumbnailUtils.isPDFThumbnailable('\t\n')).toBe(false);
    });

    test('when an invalid extension is given, then false is returned', () => {
      expect(ThumbnailUtils.isPDFThumbnailable('pdff')).toBe(false);
      expect(ThumbnailUtils.isPDFThumbnailable('pd')).toBe(false);
    });
  });

  describe('isImageThumbnailable', () => {
    test('when a thumbnailable image extension is given, then true is returned', () => {
      expect(ThumbnailUtils.isImageThumbnailable('jpg')).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('jpeg')).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('png')).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('webp')).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('gif')).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('tif')).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('tiff')).toBe(true);
    });

    test('when an extension has mixed case, then true is returned', () => {
      expect(ThumbnailUtils.isImageThumbnailable('JPG')).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('PNG')).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('GIF')).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('Jpeg')).toBe(true);
    });

    test('when an extension has surrounding whitespace, then true is returned', () => {
      expect(ThumbnailUtils.isImageThumbnailable(' jpg ')).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('  png  ')).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('\twebp\n')).toBe(true);
    });

    test('when a non-thumbnailable image format is given, then false is returned', () => {
      expect(ThumbnailUtils.isImageThumbnailable('bmp')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('heic')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('raw')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('cr2')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('nef')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('eps')).toBe(false);
    });

    test('when a non-image extension is given, then false is returned', () => {
      expect(ThumbnailUtils.isImageThumbnailable('pdf')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('doc')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('txt')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('mp4')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('mp3')).toBe(false);
    });

    test('when an empty or blank string is given, then false is returned', () => {
      expect(ThumbnailUtils.isImageThumbnailable('')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('   ')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('\t\n')).toBe(false);
    });

    test('when an invalid extension is given, then false is returned', () => {
      expect(ThumbnailUtils.isImageThumbnailable('jpgg')).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('unknown')).toBe(false);
    });
  });
});
