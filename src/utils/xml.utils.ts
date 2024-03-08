import { XMLParser, XMLBuilder, X2jOptions, XmlBuilderOptions } from 'fast-xml-parser';

export class XMLUtils {
  static toJSON(xml: string, options: X2jOptions = {}) {
    const parser = new XMLParser(options);
    return parser.parse(xml);
  }

  static toXML(object: Record<string, any>, options: XmlBuilderOptions = { format: true }) {
    const builder = new XMLBuilder(options);
    return builder.build(object);
  }

  static toWebDavXML(object: Record<string, any>, options: XmlBuilderOptions) {
    const xmlContent = this.toXML(object, options);
    return `<?xml version="1.0" encoding="utf-8" ?><multistatus xmlns:D="DAV:">${xmlContent}</multistatus>`;
  }
}
