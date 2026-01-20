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
const pdfExtensions: FileExtensionMap = {
  pdf: ['pdf'],
};
const thumbnailableImageExtension: Set<string> = new Set([
  ...imageExtensions['jpg'],
  ...imageExtensions['png'],
  ...imageExtensions['webp'],
  ...imageExtensions['gif'],
  ...imageExtensions['tiff'],
]);
const thumbnailablePdfExtension: Set<string> = new Set(pdfExtensions['pdf']);
const thumbnailableExtension: Set<string> = new Set(thumbnailableImageExtension);

export class ThumbnailUtils {
  static readonly isFileThumbnailable = (fileType: string) => {
    return fileType.trim().length > 0 && thumbnailableExtension.has(fileType.trim().toLowerCase());
  };

  static readonly isPDFThumbnailable = (fileType: string) => {
    return fileType.trim().length > 0 && thumbnailablePdfExtension.has(fileType.trim().toLowerCase());
  };

  static readonly isImageThumbnailable = (fileType: string) => {
    return fileType.trim().length > 0 && thumbnailableImageExtension.has(fileType.trim().toLowerCase());
  };
}
