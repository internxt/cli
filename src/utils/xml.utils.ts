import { XMLParser, XMLBuilder, X2jOptions, XmlBuilderOptions } from 'fast-xml-parser';

export class XMLUtils {
  static readonly DEFAULT_NAMESPACE_LETTER = 'D';

  static toJSON(xml: string, options: X2jOptions = {}) {
    const parser = new XMLParser(options);
    return parser.parse(xml);
  }

  static toXML(object: object, options: XmlBuilderOptions = { format: true }) {
    const builder = new XMLBuilder(options);
    return builder.build(object);
  }

  static toWebDavXML(object: object, options: XmlBuilderOptions) {
    const xmlContent = this.toXML(object, options);
    return `<?xml version="1.0" encoding="utf-8" ?><${XMLUtils.addDefaultNamespace('multistatus')} xmlns:${XMLUtils.DEFAULT_NAMESPACE_LETTER}="DAV:">${xmlContent}</${XMLUtils.addDefaultNamespace('multistatus')}>`;
  }

  static addDefaultNamespace(key: string) {
    return `${XMLUtils.DEFAULT_NAMESPACE_LETTER}:${key}`;
  }
}
