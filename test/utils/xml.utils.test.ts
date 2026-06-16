import { describe, expect, test } from 'vitest';
import { XMLUtils } from '../../src/utils/xml.utils';

describe('XML utils', () => {
  describe('toJSON', () => {
    test('when valid XML is provided, then a parsed object is returned', () => {
      const xml = '<root><child>value</child></root>';
      const result = XMLUtils.toJSON(xml);
      expect(result).to.be.deep.equal({ root: { child: 'value' } });
    });
  });

  describe('toXML', () => {
    test('when formatting is disabled, then unformatted XML is returned', () => {
      const object = { root: { child: 'value' } };
      const result = XMLUtils.toXML(object, { format: false });
      expect(result).to.be.equal('<root><child>value</child></root>');
    });

    test('when formatting is enabled, then formatted XML is returned', () => {
      const object = { root: { child: 'value' } };
      const result = XMLUtils.toXML(object, { format: true });
      expect(result).to.be.equal('<root>\n  <child>value</child>\n</root>\n');
    });
  });
});
