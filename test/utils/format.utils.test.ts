import { describe, expect, it } from 'vitest';
import { randomInt } from 'node:crypto';
import { FormatUtils } from '../../src/utils/format.utils';
import { UsageService } from '../../src/services/usage.service';

describe('Format utils', () => {
  it('should return a formatted date for WebDav when providing a date', () => {
    const date = new Date('2021-10-10T10:10:10Z');
    const result = FormatUtils.formatDateForWebDav(date);
    expect(result).to.be.equal('Sun, 10 Oct 2021 10:10:10 GMT');
  });

  it('should return a formatted human readable size when providing a size', () => {
    const value = randomInt(1, 500);
    const expectedSizes = [
      {
        value: value * Math.pow(1024, 0),
        expected: value + ' B',
      },
      {
        value: value * Math.pow(1024, 1),
        expected: value + ' KB',
      },
      {
        value: value * Math.pow(1024, 2),
        expected: value + ' MB',
      },
      {
        value: value * Math.pow(1024, 3),
        expected: value + ' GB',
      },
      {
        value: value * Math.pow(1024, 4),
        expected: value + ' TB',
      },
      {
        value: value * Math.pow(1024, 5),
        expected: value + ' PB',
      },
      {
        value: value * Math.pow(1024, 6),
        expected: value + ' EB',
      },
      {
        value: value * Math.pow(1024, 7),
        expected: value + ' ZB',
      },
      {
        value: value * Math.pow(1024, 8),
        expected: value + ' YB',
      },
    ];
    expectedSizes.forEach((expectedSize) => {
      const result = FormatUtils.humanFileSize(expectedSize.value);
      expect(result).to.be.equal(expectedSize.expected);
    });
  });

  it('should return a formatted human readable size with decimals when providing a size', () => {
    const expectedSizes = [
      {
        value: 1.5 * Math.pow(1024, 1),
        expected: '1.5 KB',
      },
      {
        value: 2.75 * Math.pow(1024, 2),
        expected: '2.75 MB',
      },
      {
        value: 0,
        expected: '0 B',
      },
      {
        value: 1023,
        expected: '1023 B',
      },
      {
        value: Math.pow(1024, 2) + 0.5 * Math.pow(1024, 2),
        expected: '1.5 MB',
      },
    ];
    expectedSizes.forEach((expectedSize) => {
      const result = FormatUtils.humanFileSize(expectedSize.value);
      expect(result).to.be.equal(expectedSize.expected);
    });
  });

  it('should return a formatted human readable limit when providing a limit', () => {
    const limit = randomInt(100000000000000);
    const expectedLimits = [
      {
        value: limit,
        expected: FormatUtils.humanFileSize(limit),
      },
      {
        value: UsageService.INFINITE_LIMIT,
        expected: 'infinity',
      },
    ];
    expectedLimits.forEach((expectedLimit) => {
      const result = FormatUtils.formatLimit(expectedLimit.value);
      expect(result).to.be.equal(expectedLimit.expected);
    });
  });
});
