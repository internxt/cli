import { describe, expect, it } from 'vitest';
import { XMLUtils } from '../../src/utils/xml.utils';

describe('XML utils', () => {
  describe('toJSON', () => {
    it('should return a json parsed XML object when the XML is valid', () => {
      const xml = '<root><child>value</child></root>';
      const result = XMLUtils.toJSON(xml);
      expect(result).to.be.deep.equal({ root: { child: 'value' } });
    });
  });

  describe('toXML', () => {
    it('should return an unformatted XML when format is false', () => {
      const object = { root: { child: 'value' } };
      const result = XMLUtils.toXML(object, { format: false });
      expect(result).to.be.equal('<root><child>value</child></root>');
    });

    it('should return a formatted XML when format is true', () => {
      const object = { root: { child: 'value' } };
      const result = XMLUtils.toXML(object, { format: true });
      expect(result).to.be.equal('<root>\n  <child>value</child>\n</root>\n');
    });
  });
});
