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

  static toWebDavXML(object: object, options: XmlBuilderOptions, rootObject = 'multistatus') {
    const xmlContent = this.toXML(object, options);
    return (
      '<?xml version="1.0" encoding="utf-8" ?>' +
      `<${XMLUtils.addDefaultNamespace(rootObject)} xmlns:${XMLUtils.DEFAULT_NAMESPACE_LETTER}="DAV:">` +
      `${xmlContent}` +
      `</${XMLUtils.addDefaultNamespace(rootObject)}>`
    );
  }

  static addDefaultNamespace(key: string) {
    return `${XMLUtils.DEFAULT_NAMESPACE_LETTER}:${key}`;
  }

  static encodeWebDavUri(uri: string) {
    return encodeURIComponent(uri).replaceAll('%2F', '/');
  }
}
