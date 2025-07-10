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
const thumbnailableImageExtension: string[] = [
  ...imageExtensions['jpg'],
  ...imageExtensions['png'],
  ...imageExtensions['webp'],
  ...imageExtensions['gif'],
  ...imageExtensions['tiff'],
];
const thumbnailablePdfExtension: string[] = pdfExtensions['pdf'];
const thumbnailableExtension: string[] = [...thumbnailableImageExtension];

export const isFileThumbnailable = (fileType: string) => {
  return fileType.trim().length > 0 && thumbnailableExtension.includes(fileType.trim().toLowerCase());
};

export const isPDFThumbnailable = (fileType: string) => {
  return fileType.trim().length > 0 && thumbnailablePdfExtension.includes(fileType.trim().toLowerCase());
};

export const isImageThumbnailable = (fileType: string) => {
  return fileType.trim().length > 0 && thumbnailableImageExtension.includes(fileType.trim().toLowerCase());
};
