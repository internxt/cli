import sharp from 'sharp';

export const ThumbnailConfig = {
  MaxWidth: 300,
  MaxHeight: 300,
  Quality: 100,
  Type: 'png',
} as const;

export const getThumbnailFromImageBuffer = (buffer: Buffer): Promise<Buffer> => {
  return sharp(buffer)
    .resize({
      height: ThumbnailConfig.MaxHeight,
      width: ThumbnailConfig.MaxWidth,
      fit: 'inside',
    })
    .png({
      quality: ThumbnailConfig.Quality,
    })
    .toBuffer();
};

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
const thumbnailableImageExtension: string[] = [
  ...imageExtensions['jpg'],
  ...imageExtensions['png'],
  ...imageExtensions['webp'],
  ...imageExtensions['gif'],
  ...imageExtensions['tiff'],
];
const pdfExtensions: FileExtensionMap = {
  pdf: ['pdf'],
};
const thumbnailablePdfExtension: string[] = pdfExtensions['pdf'];
const thumbnailableExtension: string[] = [...thumbnailableImageExtension];

export const isFileThumbnailable = (fileType: string) => {
  return fileType.trim().length > 0 && thumbnailableExtension.includes(fileType);
};
