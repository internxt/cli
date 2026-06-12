import { UsageService } from '../services/usage.service';
import { FormatUtils } from './format.utils';

const HUNDRED_GIGABYTES = 100 * 1024 * 1024 * 1024;

export class UploadUtils {
  static readonly checkUploadSizeLimits = async (size: number): Promise<void> => {
    const limits = await UsageService.instance.fetchLimits();
    if (limits?.maxUploadFileSize && size >= limits.maxUploadFileSize) {
      const formattedSize = FormatUtils.humanFileSize(size);
      const formattedLimit = FormatUtils.humanFileSize(limits.maxUploadFileSize);
      throw new Error(`File is too big (${formattedSize} exceeds account upload limit of ${formattedLimit})`);
    }

    if (size >= HUNDRED_GIGABYTES) {
      throw new Error('File is too big (more than 100 GB)');
    }
  };
}
