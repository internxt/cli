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
}
