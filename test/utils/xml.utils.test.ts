import { expect } from 'chai';
import { XMLUtils } from '../../src/utils/xml.utils';
describe('XML utils', () => {
  it('When providing a string, it should return a parsed XML', () => {
    const xml = '<root><child>value</child></root>';
    const result = XMLUtils.toJSON(xml);
    expect(result).to.be.deep.eq({ root: { child: 'value' } });
  });

  it('When providing an object, it should return an XML', () => {
    const object = { root: { child: 'value' } };
    const result = XMLUtils.toXML(object);
    expect(result).to.be.eq('<root><child>value</child></root>');
  });
});
