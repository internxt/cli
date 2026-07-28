import { describe, expect, test } from 'vitest';
import { ThumbnailUtils } from '../../src/utils/thumbnail.utils';

describe('Thumbnail Utils tests', () => {
  describe('isImageThumbnailable', () => {
    const validSize = 1024;

    test('when a thumbnailable image extension is given, then true is returned', () => {
      expect(ThumbnailUtils.isImageThumbnailable('jpg', validSize)).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('jpeg', validSize)).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('png', validSize)).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('webp', validSize)).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('gif', validSize)).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('tif', validSize)).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('tiff', validSize)).toBe(true);
    });

    test('when an extension has mixed case, then true is returned', () => {
      expect(ThumbnailUtils.isImageThumbnailable('JPG', validSize)).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('PNG', validSize)).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('GIF', validSize)).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('Jpeg', validSize)).toBe(true);
    });

    test('when an extension has surrounding whitespace, then true is returned', () => {
      expect(ThumbnailUtils.isImageThumbnailable(' jpg ', validSize)).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('  png  ', validSize)).toBe(true);
      expect(ThumbnailUtils.isImageThumbnailable('\twebp\n', validSize)).toBe(true);
    });

    test('when a non-thumbnailable image format is given, then false is returned', () => {
      expect(ThumbnailUtils.isImageThumbnailable('bmp', validSize)).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('heic', validSize)).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('raw', validSize)).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('cr2', validSize)).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('nef', validSize)).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('eps', validSize)).toBe(false);
    });

    test('when a non-image extension is given, then false is returned', () => {
      expect(ThumbnailUtils.isImageThumbnailable('pdf', validSize)).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('doc', validSize)).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('txt', validSize)).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('mp4', validSize)).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('mp3', validSize)).toBe(false);
    });

    test('when an empty or blank string is given, then false is returned', () => {
      expect(ThumbnailUtils.isImageThumbnailable('', validSize)).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('   ', validSize)).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('\t\n', validSize)).toBe(false);
    });

    test('when an invalid extension is given, then false is returned', () => {
      expect(ThumbnailUtils.isImageThumbnailable('jpgg', validSize)).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('unknown', validSize)).toBe(false);
    });

    test('when the size is zero or negative, then false is returned', () => {
      expect(ThumbnailUtils.isImageThumbnailable('jpg', 0)).toBe(false);
      expect(ThumbnailUtils.isImageThumbnailable('jpg', -1)).toBe(false);
    });

    test('when the size exceeds the max thumbnailable size, then false is returned', () => {
      expect(ThumbnailUtils.isImageThumbnailable('jpg', ThumbnailUtils.MAX_IMAGE_THUMBNAILABLE_SIZE_IN_BYTES + 1)).toBe(
        false,
      );
    });
  });
});
