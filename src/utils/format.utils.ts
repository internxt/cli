import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { UsageService } from '../services/usage.service';

dayjs.extend(utc);
export class FormatUtils {
  static readonly humanFileSize = (size: number) => {
    const i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
    return Number((size / Math.pow(1024, i)).toFixed(2)) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
  };

  static readonly formatDate = (date: string | Date) => {
    return dayjs(date).format('D MMMM, YYYY [at] HH:mm');
  };

  static readonly formatDateForWebDav = (date: string | Date) => {
    return dayjs.utc(date).format('ddd, DD MMM YYYY HH:mm:ss [GMT]');
  };

  static readonly formatLimit = (limit: number): string => {
    let result = '...';
    if (limit > 0) {
      result = limit === UsageService.INFINITE_LIMIT ? 'infinity' : this.humanFileSize(limit);
    }
    return result;
  };
}
