import { expect } from 'chai';
import { FormatUtils } from '../../src/utils/format.utils';
describe('Format utils', () => {
  it('When providing a date, it should return a formatted date for WebDav', () => {
    // Arrange
    const date = new Date('2021-10-10T10:10:10Z');
    // Act
    const result = FormatUtils.formatDateForWebDav(date);
    // Assert
    expect(result).to.be.eq('Sun, 10 Oct 2021 10:10:10 GMT');
  });
});
