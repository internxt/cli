import { Readable } from 'node:stream';
import { NetworkFacade } from '../services/network/network-facade.service';
import { ThumbnailService } from '../services/thumbnail.service';
import { ErrorUtils } from './errors.utils';
import { BufferStream } from './stream.utils';
import { createReadStream } from 'node:fs';

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
const thumbnailablePdfExtension: Set<string> = new Set([...pdfExtensions['pdf']]);
const thumbnailableExtension: Set<string> = new Set([...thumbnailableImageExtension]);

export const isFileThumbnailable = (fileType: string) => {
  return fileType.trim().length > 0 && thumbnailableExtension.has(fileType.trim().toLowerCase());
};

export const isPDFThumbnailable = (fileType: string) => {
  return fileType.trim().length > 0 && thumbnailablePdfExtension.has(fileType.trim().toLowerCase());
};

export const isImageThumbnailable = (fileType: string) => {
  return fileType.trim().length > 0 && thumbnailableImageExtension.has(fileType.trim().toLowerCase());
};

export const tryUploadThumbnail = async ({
  bufferStream,
  fileType,
  userBucket,
  fileUuid,
  networkFacade,
}: {
  bufferStream?: BufferStream;
  fileType: string;
  userBucket: string;
  fileUuid: string;
  networkFacade: NetworkFacade;
}) => {
  try {
    const thumbnailBuffer = bufferStream?.getBuffer();
    if (thumbnailBuffer) {
      await ThumbnailService.instance.uploadThumbnail(thumbnailBuffer, fileType, userBucket, fileUuid, networkFacade);
    }
  } catch (error) {
    ErrorUtils.report(error);
  }
};

export const createFileStreamWithBuffer = ({
  path,
  fileType,
}: {
  path: string;
  fileType: string;
}): {
  bufferStream?: BufferStream;
  fileStream: Readable;
} => {
  const readable: Readable = createReadStream(path);
  if (isFileThumbnailable(fileType)) {
    const bufferStream = new BufferStream();
    return {
      bufferStream,
      fileStream: readable.pipe(bufferStream),
    };
  }
  return { fileStream: readable };
};
