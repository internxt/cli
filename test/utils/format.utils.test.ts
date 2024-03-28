import { expect } from 'chai';
import { randomInt } from 'crypto';
import { FormatUtils } from '../../src/utils/format.utils';
import { UsageService } from '../../src/services/usage.service';

describe('Format utils', () => {
  it('When providing a date, it should return a formatted date for WebDav', () => {
    // Arrange
    const date = new Date('2021-10-10T10:10:10Z');
    // Act
    const result = FormatUtils.formatDateForWebDav(date);
    // Assert
    expect(result).to.be.eq('Sun, 10 Oct 2021 10:10:10 GMT');
  });

  it('When providing a size, it should return a formatted human readable size', () => {
    const value = randomInt(500);
    const expectedSizes = [
      {
        value: value * Math.pow(1024, 0),
        expected: value + ' B',
      },
      {
        value: value * Math.pow(1024, 1),
        expected: value + ' kB',
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
    ];
    expectedSizes.forEach((expectedSize) => {
      const result = FormatUtils.humanFileSize(expectedSize.value);
      expect(result).to.be.equal(expectedSize.expected);
    });
  });

  it('When providing a limit, it should return a formatted human readable limit', () => {
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
