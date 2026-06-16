import { beforeEach, describe, expect, test, vi } from 'vitest';
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
    test('when no upload limit is set and the file is under 100GB, then no error is thrown', async () => {
      vi.spyOn(UsageService.instance, 'fetchLimits').mockResolvedValue(undefined as never);

      await expect(UploadUtils.checkUploadSizeLimits(5 * 1024 * 1024 * 1024)).resolves.toBeUndefined();
    });

    test('when the upload limit is unavailable, then no error is thrown', async () => {
      vi.spyOn(UsageService.instance, 'fetchLimits').mockResolvedValue(null as never);

      await expect(UploadUtils.checkUploadSizeLimits(5 * 1024 * 1024 * 1024)).resolves.toBeUndefined();
    });

    test('when the file size is below the account upload limit, then no error is thrown', async () => {
      vi.spyOn(UsageService.instance, 'fetchLimits').mockResolvedValue({
        maxUploadFileSize: 8 * 1024 * 1024 * 1024,
        versioning: { enabled: false, maxFileSize: 0, retentionDays: 0, maxVersions: 0 },
      });

      await expect(UploadUtils.checkUploadSizeLimits(5 * 1024 * 1024 * 1024)).resolves.toBeUndefined();
    });

    test('when the file size exceeds the account upload limit, then an error is thrown', async () => {
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

    test('when the file size equals the account upload limit, then no error is thrown', async () => {
      const limitBytes = 10 * 1024 * 1024 * 1024;
      vi.spyOn(UsageService.instance, 'fetchLimits').mockResolvedValue({
        maxUploadFileSize: limitBytes,
        versioning: { enabled: false, maxFileSize: 0, retentionDays: 0, maxVersions: 0 },
      });

      await expect(UploadUtils.checkUploadSizeLimits(limitBytes)).resolves.toBeUndefined();
    });

    test('when the file exceeds 100GB and no account limit is set, then an error is thrown', async () => {
      vi.spyOn(UsageService.instance, 'fetchLimits').mockResolvedValue(undefined as never);

      await expect(UploadUtils.checkUploadSizeLimits(101 * 1024 * 1024 * 1024)).rejects.toThrow(
        'File is too big (more than 100 GB)',
      );
    });

    test('when the file exceeds 100GB, then an error is thrown', async () => {
      vi.spyOn(UsageService.instance, 'fetchLimits').mockResolvedValue({
        maxUploadFileSize: 200 * 1024 * 1024 * 1024,
        versioning: { enabled: false, maxFileSize: 0, retentionDays: 0, maxVersions: 0 },
      });

      await expect(UploadUtils.checkUploadSizeLimits(150 * 1024 * 1024 * 1024)).rejects.toThrow(
        'File is too big (more than 100 GB)',
      );
    });

    test('when the account limit is lower than the default, then the account limit is enforced', async () => {
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
    test('when the file type does not support thumbnails, then the original stream is returned without a thumbnail', () => {
      vi.spyOn(ThumbnailUtils, 'isFileThumbnailable').mockReturnValue(false);
      const readable = Readable.from(['test']);

      const result = UploadUtils.prepareUploadStreams(readable, 'pdf');

      expect(result.fileStream).toBe(readable);
      expect(result.thumbnailStream).toBeUndefined();
      expect(result.isThumbnailable).toBe(false);
    });

    test('when the file type supports thumbnails, then a piped stream and thumbnail stream are returned', () => {
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
    test('when calculating upload timing, then the total time is the sum of all stages', () => {
      vi.spyOn(CLIUtils, 'calculateThroughputMBps').mockReturnValue(5);
      vi.spyOn(CLIUtils, 'formatDuration').mockReturnValue('00:00:01.000');

      const result = UploadUtils.getTimings(1024 * 1024 * 10, {
        networkUpload: 1000,
        driveUpload: 2000,
        thumbnailUpload: 500,
      });

      expect(result.totalTime).toBe(3500);
    });

    test('when calculating throughput, then the size and upload time are used', () => {
      const calculateThroughputSpy = vi.spyOn(CLIUtils, 'calculateThroughputMBps').mockReturnValue(2.5);
      vi.spyOn(CLIUtils, 'formatDuration').mockReturnValue('00:00:01.000');

      UploadUtils.getTimings(1024 * 1024 * 5, {
        networkUpload: 2000,
        driveUpload: 1000,
        thumbnailUpload: 500,
      });

      expect(calculateThroughputSpy).toHaveBeenCalledWith(1024 * 1024 * 5, 2000);
    });

    test('when calculating throughput, then the speed in MB/s is returned', () => {
      vi.spyOn(CLIUtils, 'calculateThroughputMBps').mockReturnValue(12.34);
      vi.spyOn(CLIUtils, 'formatDuration').mockReturnValue('00:00:01.000');

      const result = UploadUtils.getTimings(1024 * 1024 * 10, {
        networkUpload: 1000,
        driveUpload: 500,
        thumbnailUpload: 200,
      });

      expect(result.throughputMBps).toBe(12.34);
    });

    test('when calculating timing, then a detailed breakdown string is built', () => {
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

    test('when all timing values are zero, then the totals are zero', () => {
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
