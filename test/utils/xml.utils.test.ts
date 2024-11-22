import { describe, expect, it } from 'vitest';
import { XMLUtils } from '../../src/utils/xml.utils';

describe('XML utils', () => {
  it('When providing a string, it should return a parsed XML', () => {
    const xml = '<root><child>value</child></root>';
    const result = XMLUtils.toJSON(xml);
    expect(result).to.be.deep.equal({ root: { child: 'value' } });
  });

  it('When providing an object, it should return an XML', () => {
    const object = { root: { child: 'value' } };
    const result = XMLUtils.toXML(object, { format: false });
    expect(result).to.be.equal('<root><child>value</child></root>');
  });

  it('When providing an object, it should return a formatted XML', () => {
    const object = { root: { child: 'value' } };
    const result = XMLUtils.toXML(object);
    expect(result.replace(/\s/g, '')).to.be.equal('<root><child>value</child></root>');
  });
});
