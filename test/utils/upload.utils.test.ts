import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Readable } from 'node:stream';
import { UploadUtils } from '../../src/utils/upload.utils';
import { UsageService } from '../../src/services/usage.service';
import { ThumbnailUtils } from '../../src/utils/thumbnail.utils';
import { CLIUtils } from '../../src/utils/cli.utils';
import { FormatUtils } from '../../src/utils/format.utils';
import { BufferStream } from '../../src/utils/stream.utils';

describe('UploadUtils', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('checkUploadSizeLimits', () => {
    it('should not throw when fetchLimits returns no maxUploadFileSize and size is under 10GB', async () => {
      vi.spyOn(UsageService.instance, 'fetchLimits').mockResolvedValue(undefined as never);

      await expect(UploadUtils.checkUploadSizeLimits(5 * 1024 * 1024 * 1024)).resolves.toBeUndefined();
    });

    it('should not throw when fetchLimits returns null', async () => {
      vi.spyOn(UsageService.instance, 'fetchLimits').mockResolvedValue(null as never);

      await expect(UploadUtils.checkUploadSizeLimits(5 * 1024 * 1024 * 1024)).resolves.toBeUndefined();
    });

    it('should not throw when size is below the account upload limit', async () => {
      vi.spyOn(UsageService.instance, 'fetchLimits').mockResolvedValue({
        maxUploadFileSize: 8 * 1024 * 1024 * 1024,
        versioning: { enabled: false, maxFileSize: 0, retentionDays: 0, maxVersions: 0 },
      });

      await expect(UploadUtils.checkUploadSizeLimits(5 * 1024 * 1024 * 1024)).resolves.toBeUndefined();
    });

    it('should throw when size exceeds the account upload limit', async () => {
      const limitBytes = 10 * 1024 * 1024 * 1024;
      const sizeBytes = 15 * 1024 * 1024 * 1024;
      vi.spyOn(UsageService.instance, 'fetchLimits').mockResolvedValue({
        maxUploadFileSize: limitBytes,
        versioning: { enabled: false, maxFileSize: 0, retentionDays: 0, maxVersions: 0 },
      });

      await expect(UploadUtils.checkUploadSizeLimits(sizeBytes)).rejects.toThrow(
        `File is too big (${FormatUtils.humanFileSize(sizeBytes)} exceeds account ` +
          `upload limit of ${FormatUtils.humanFileSize(limitBytes)})`,
      );
    });

    it('should not throw when size equals the account upload limit', async () => {
      const limitBytes = 10 * 1024 * 1024 * 1024;
      vi.spyOn(UsageService.instance, 'fetchLimits').mockResolvedValue({
        maxUploadFileSize: limitBytes,
        versioning: { enabled: false, maxFileSize: 0, retentionDays: 0, maxVersions: 0 },
      });

      await expect(UploadUtils.checkUploadSizeLimits(limitBytes)).resolves.toBeUndefined();
    });

    it('should throw when size exceeds 10GB even if no account limit is set', async () => {
      vi.spyOn(UsageService.instance, 'fetchLimits').mockResolvedValue(undefined as never);

      await expect(UploadUtils.checkUploadSizeLimits(11 * 1024 * 1024 * 1024)).rejects.toThrow(
        'File is too big (more than 10 GB)',
      );
    });

    it('should throw when size > 10GB', async () => {
      vi.spyOn(UsageService.instance, 'fetchLimits').mockResolvedValue({
        maxUploadFileSize: 20 * 1024 * 1024 * 1024,
        versioning: { enabled: false, maxFileSize: 0, retentionDays: 0, maxVersions: 0 },
      });

      await expect(UploadUtils.checkUploadSizeLimits(15 * 1024 * 1024 * 1024)).rejects.toThrow(
        'File is too big (more than 10 GB)',
      );
    });

    it('should use the account limit when it is below the default limit', async () => {
      const limitBytes = 8 * 1024 * 1024 * 1024;
      vi.spyOn(UsageService.instance, 'fetchLimits').mockResolvedValue({
        maxUploadFileSize: limitBytes,
        versioning: { enabled: false, maxFileSize: 0, retentionDays: 0, maxVersions: 0 },
      });

      await expect(UploadUtils.checkUploadSizeLimits(9 * 1024 * 1024 * 1024)).rejects.toThrow(
        `File is too big (${FormatUtils.humanFileSize(9 * 1024 * 1024 * 1024)} exceeds account ` +
          `upload limit of ${FormatUtils.humanFileSize(limitBytes)})`,
      );
    });
  });

  describe('prepareUploadStreams', () => {
    it('should return the original stream and no thumbnail when file type is not thumbnailable', () => {
      vi.spyOn(ThumbnailUtils, 'isFileThumbnailable').mockReturnValue(false);
      const readable = Readable.from(['test']);

      const result = UploadUtils.prepareUploadStreams(readable, 'pdf');

      expect(result.fileStream).toBe(readable);
      expect(result.thumbnailStream).toBeUndefined();
      expect(result.isThumbnailable).toBe(false);
    });

    it('should return a piped stream and a BufferStream when file type is thumbnailable', () => {
      vi.spyOn(ThumbnailUtils, 'isFileThumbnailable').mockReturnValue(true);
      const readable = Readable.from(['test-data']);

      const result = UploadUtils.prepareUploadStreams(readable, 'jpg');

      expect(result.fileStream).not.toBe(readable);
      expect(result.fileStream).toBeInstanceOf(Readable);
      expect(result.thumbnailStream).toBeInstanceOf(BufferStream);
      expect(result.isThumbnailable).toBe(true);
    });
  });

  describe('getTimings', () => {
    it('should calculate total time as the sum of all timings', () => {
      vi.spyOn(CLIUtils, 'calculateThroughputMBps').mockReturnValue(5);
      vi.spyOn(CLIUtils, 'formatDuration').mockReturnValue('00:00:01.000');

      const result = UploadUtils.getTimings(1024 * 1024 * 10, {
        networkUpload: 1000,
        driveUpload: 2000,
        thumbnailUpload: 500,
      });

      expect(result.totalTime).toBe(3500);
    });

    it('should call calculateThroughputMBps with size and networkUpload time', () => {
      const calculateThroughputSpy = vi.spyOn(CLIUtils, 'calculateThroughputMBps').mockReturnValue(2.5);
      vi.spyOn(CLIUtils, 'formatDuration').mockReturnValue('00:00:01.000');

      UploadUtils.getTimings(1024 * 1024 * 5, {
        networkUpload: 2000,
        driveUpload: 1000,
        thumbnailUpload: 500,
      });

      expect(calculateThroughputSpy).toHaveBeenCalledWith(1024 * 1024 * 5, 2000);
    });

    it('should return throughputMBps from calculateThroughputMBps', () => {
      vi.spyOn(CLIUtils, 'calculateThroughputMBps').mockReturnValue(12.34);
      vi.spyOn(CLIUtils, 'formatDuration').mockReturnValue('00:00:01.000');

      const result = UploadUtils.getTimings(1024 * 1024 * 10, {
        networkUpload: 1000,
        driveUpload: 500,
        thumbnailUpload: 200,
      });

      expect(result.throughputMBps).toBe(12.34);
    });

    it('should build a timing breakdown string with formatted durations', () => {
      vi.spyOn(CLIUtils, 'calculateThroughputMBps').mockReturnValue(10);
      vi.spyOn(CLIUtils, 'formatDuration').mockImplementation((ms: number) => `formatted-${ms}`);

      const result = UploadUtils.getTimings(1024 * 1024 * 10, {
        networkUpload: 2000,
        driveUpload: 1500,
        thumbnailUpload: 700,
      });

      expect(result.timingBreakdown).toBe(
        'Network upload: formatted-2000 (10.00 MB/s)\n' +
          'Drive upload: formatted-1500\n' +
          'Thumbnail: formatted-700\n',
      );
    });

    it('should handle all-zero timings', () => {
      vi.spyOn(CLIUtils, 'calculateThroughputMBps').mockReturnValue(0);
      vi.spyOn(CLIUtils, 'formatDuration').mockReturnValue('00:00:00.000');

      const result = UploadUtils.getTimings(0, {
        networkUpload: 0,
        driveUpload: 0,
        thumbnailUpload: 0,
      });

      expect(result.totalTime).toBe(0);
      expect(result.throughputMBps).toBe(0);
    });
  });
});
