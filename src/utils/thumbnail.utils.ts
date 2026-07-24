export const ThumbnailConfig = {
  MaxWidth: 300,
  MaxHeight: 300,
  Quality: 100,
  Type: 'png',
} as const;

type FileExtensionMap = Record<string, string[]>;
const imageExtensions: FileExtensionMap = {
  tiff: ['tif', 'tiff'],
  bmp: ['bmp'],
  heic: ['heic'],
  jpg: ['jpg', 'jpeg'],
  gif: ['gif'],
  png: ['png'],
  eps: ['eps'],
  raw: ['raw', 'cr2', 'nef', 'orf', 'sr2'],
  webp: ['webp'],
};
const thumbnailableImageExtension: Set<string> = new Set([
  ...imageExtensions['jpg'],
  ...imageExtensions['png'],
  ...imageExtensions['webp'],
  ...imageExtensions['gif'],
  ...imageExtensions['tiff'],
]);

export class ThumbnailUtils {
  static readonly MAX_IMAGE_THUMBNAILABLE_SIZE_IN_BYTES = 128 * 1024 * 1024;

  static readonly isImageThumbnailable = (fileType: string, size: number) => {
    if (size <= 0 || size > ThumbnailUtils.MAX_IMAGE_THUMBNAILABLE_SIZE_IN_BYTES) {
      return false;
    }
    return fileType.trim().length > 0 && thumbnailableImageExtension.has(fileType.trim().toLowerCase());
  };
}
