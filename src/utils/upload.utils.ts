import { UsageService } from '../services/usage.service';
import { FormatUtils } from './format.utils';
import { Readable } from 'node:stream';
import { BufferStream } from './stream.utils';
import { ThumbnailUtils } from './thumbnail.utils';
import { CLIUtils } from './cli.utils';

const TEN_GIGABYTES = 10 * 1024 * 1024 * 1024;

export class UploadUtils {
  static readonly checkUploadSizeLimits = async (size: number): Promise<void> => {
    const limits = await UsageService.instance.fetchLimits();
    if (limits?.maxUploadFileSize && size > limits.maxUploadFileSize) {
      const formattedSize = FormatUtils.humanFileSize(size);
      const formattedLimit = FormatUtils.humanFileSize(limits.maxUploadFileSize);
      throw new Error(`File is too big (${formattedSize} exceeds account upload limit of ${formattedLimit})`);
    }

    if (size > TEN_GIGABYTES) {
      //Default limit if limits are not set from backend
      throw new Error('File is too big (more than 10 GB)');
    }
  };

  static readonly prepareUploadStreams = (
    readable: Readable,
    fileType: string,
  ): {
    fileStream: Readable;
    thumbnailStream: BufferStream | undefined;
    isThumbnailable: boolean;
  } => {
    const isThumbnailable = ThumbnailUtils.isFileThumbnailable(fileType);
    if (!isThumbnailable) {
      return { fileStream: readable, thumbnailStream: undefined, isThumbnailable };
    }
    const bufferStream = new BufferStream();
    const fileStream = readable.pipe(bufferStream);
    return { fileStream, thumbnailStream: bufferStream, isThumbnailable };
  };

  static readonly getTimings = (
    size: number,
    timings: {
      networkUpload: number;
      driveUpload: number;
      thumbnailUpload: number;
    },
  ): {
    totalTime: number;
    throughputMBps: number;
    timingBreakdown: string;
  } => {
    const totalTime = Object.values(timings).reduce((sum, time) => sum + time, 0);
    const throughputMBps = CLIUtils.calculateThroughputMBps(size, timings.networkUpload);
    const timingBreakdown =
      `Network upload: ${CLIUtils.formatDuration(timings.networkUpload)} (${throughputMBps.toFixed(2)} MB/s)\n` +
      `Drive upload: ${CLIUtils.formatDuration(timings.driveUpload)}\n` +
      `Thumbnail: ${CLIUtils.formatDuration(timings.thumbnailUpload)}\n`;
    return { totalTime, throughputMBps, timingBreakdown };
  };
}
