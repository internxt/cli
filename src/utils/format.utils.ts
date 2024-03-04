import dayjs from 'dayjs';

export class FormatUtils {
  static readonly humanFileSize = (size: number) => {
    const i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
    return Number((size / Math.pow(1024, i)).toFixed(2)) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
  };

  static readonly formatDate = (date: string | Date) => {
    return dayjs(date).format('D MMMM, YYYY [at] HH:mm');
  };

  static readonly formatDateForWebDav = (date: string | Date) => {
    return dayjs(date).format('ddd, DD MMM YYYY HH:mm:ss [GMT]');
  };
}
