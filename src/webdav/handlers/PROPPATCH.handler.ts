import { Request, Response } from 'express';
import { WebDavMethodHandler } from '../../types/webdav.types';
import { WebDavUtils } from '../../utils/webdav.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { XMLUtils } from '../../utils/xml.utils';
import { NotFoundError } from '../../utils/errors.utils';

export class PROPPATCHRequestHandler implements WebDavMethodHandler {
  handle = async (req: Request, res: Response) => {
    const resource = await WebDavUtils.getRequestedResource(req.url);
    webdavLogger.info(`[PROPPATCH] Request received for item at ${resource.url}`);

    const driveItem = await WebDavUtils.getDriveItemFromResource(resource);
    if (!driveItem) {
      throw new NotFoundError(`Resource not found on Internxt Drive at ${resource.url}`);
    }

    const propertyNames = this.getRequestedPropertyNames(req.body);

    // This server has no custom property store, so every requested property change is rejected.
    // RFC 4918 9.2 expects a 207 Multi-Status with a per-property status, not a flat error.
    const propNode = Object.fromEntries(propertyNames.map((name) => [name, '']));

    const responseXML = XMLUtils.toWebDavXML(
      {
        [XMLUtils.addDefaultNamespace('response')]: {
          [XMLUtils.addDefaultNamespace('href')]: XMLUtils.encodeWebDavUri(resource.url),
          [XMLUtils.addDefaultNamespace('propstat')]: {
            [XMLUtils.addDefaultNamespace('prop')]: propNode,
            [XMLUtils.addDefaultNamespace('status')]: 'HTTP/1.1 403 Forbidden',
          },
        },
      },
      { suppressEmptyNode: true },
    );

    res.set('Content-Type', 'application/xml; charset="utf-8"');
    res.status(207).send(responseXML);
  };

  private readonly getRequestedPropertyNames = (body: unknown): string[] => {
    if (typeof body !== 'string' || body.trim().length === 0) {
      return [];
    }

    try {
      const parsed = XMLUtils.toJSON(body, { ignoreAttributes: false });
      const propertyUpdate = parsed?.['D:propertyupdate'] ?? parsed?.propertyupdate;
      const sections = [
        propertyUpdate?.['D:set'] ?? propertyUpdate?.set,
        propertyUpdate?.['D:remove'] ?? propertyUpdate?.remove,
      ];

      const names = new Set<string>();
      for (const section of sections) {
        const prop = section?.['D:prop'] ?? section?.prop;
        if (prop && typeof prop === 'object') {
          for (const key of Object.keys(prop)) {
            if (!key.startsWith('@_')) {
              names.add(key);
            }
          }
        }
      }

      return Array.from(names);
    } catch (error) {
      webdavLogger.warn(
        `[PROPPATCH] Failed to parse request body: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  };
}
