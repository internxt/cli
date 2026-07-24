import { afterEach, describe, expect, test, vi } from 'vitest';
import { ThumbnailService } from '../../src/services/thumbnail.service';
import { NetworkFacade } from '../../src/services/network/network-facade.service';

describe('Thumbnail Service tests', () => {
  const networkFacade = {} as NetworkFacade;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('tryUploadThumbnail', () => {
    test('when an input is provided and the size is greater than zero, then the thumbnail is uploaded', async () => {
      const uploadThumbnailSpy = vi.spyOn(ThumbnailService.instance, 'uploadThumbnail').mockResolvedValue(undefined);

      await ThumbnailService.instance.tryUploadThumbnail({
        input: '/path/to/image.png',
        fileType: 'png',
        bucket: 'bucket-id',
        fileUuid: 'file-uuid',
        networkFacade,
        size: 1024,
      });

      expect(uploadThumbnailSpy).toHaveBeenCalledWith(
        '/path/to/image.png',
        'png',
        'bucket-id',
        'file-uuid',
        networkFacade,
        1024,
      );
    });

    test('when no input is provided, then no thumbnail is uploaded', async () => {
      const uploadThumbnailSpy = vi.spyOn(ThumbnailService.instance, 'uploadThumbnail').mockResolvedValue(undefined);

      await ThumbnailService.instance.tryUploadThumbnail({
        input: undefined,
        fileType: 'png',
        bucket: 'bucket-id',
        fileUuid: 'file-uuid',
        networkFacade,
        size: 1024,
      });

      expect(uploadThumbnailSpy).not.toHaveBeenCalled();
    });

    test('when the size is zero, then no thumbnail is uploaded', async () => {
      const uploadThumbnailSpy = vi.spyOn(ThumbnailService.instance, 'uploadThumbnail').mockResolvedValue(undefined);

      await ThumbnailService.instance.tryUploadThumbnail({
        input: '/path/to/image.png',
        fileType: 'png',
        bucket: 'bucket-id',
        fileUuid: 'file-uuid',
        networkFacade,
        size: 0,
      });

      expect(uploadThumbnailSpy).not.toHaveBeenCalled();
    });

    test('when the thumbnail upload fails, then the error is swallowed', async () => {
      vi.spyOn(ThumbnailService.instance, 'uploadThumbnail').mockRejectedValue(new Error('upload failed'));

      await expect(
        ThumbnailService.instance.tryUploadThumbnail({
          input: '/path/to/image.png',
          fileType: 'png',
          bucket: 'bucket-id',
          fileUuid: 'file-uuid',
          networkFacade,
          size: 1024,
        }),
      ).resolves.toBeUndefined();
    });
  });
});
