import { Request, Response } from 'express';
import { WebDavMethodHandler } from '../../types/webdav.types';
import { randomUUID } from 'node:crypto';
import { webdavLogger } from '../../utils/logger.utils';
import { XMLUtils } from '../../utils/xml.utils';

const LOCK_TIMEOUT_SECONDS = 300;

export class LOCKRequestHandler implements WebDavMethodHandler {
  handle = async (req: Request, res: Response) => {
    const lockToken = `opaquelocktoken:${randomUUID()}`;

    webdavLogger.info(`[LOCK] Granted lock token ${lockToken} for ${req.url}`);

    const depth = req.headers['depth'] ?? '0';
    const timeout = req.headers['timeout'] ?? `Second-${LOCK_TIMEOUT_SECONDS}`;

    let owner: Record<string, string> | undefined;
    try {
      const parsed = XMLUtils.toJSON(req.body, { ignoreAttributes: false });
      const maybeOwner = parsed?.['D:lockinfo']?.['D:owner'];
      if (maybeOwner != null) {
        owner = { [XMLUtils.addDefaultNamespace('owner')]: maybeOwner };
      }
    } catch {
      // no owner in body, ignore
    }

    const lockDiscoveryXml = XMLUtils.toWebDavXML(
      {
        [XMLUtils.addDefaultNamespace('lockdiscovery')]: {
          [XMLUtils.addDefaultNamespace('activelock')]: {
            [XMLUtils.addDefaultNamespace('locktype')]: {
              [XMLUtils.addDefaultNamespace('write')]: '',
            },
            [XMLUtils.addDefaultNamespace('lockscope')]: {
              [XMLUtils.addDefaultNamespace('exclusive')]: '',
            },
            [XMLUtils.addDefaultNamespace('depth')]: depth,
            [XMLUtils.addDefaultNamespace('timeout')]: timeout,
            [XMLUtils.addDefaultNamespace('locktoken')]: {
              [XMLUtils.addDefaultNamespace('href')]: lockToken,
            },
            [XMLUtils.addDefaultNamespace('lockroot')]: {
              [XMLUtils.addDefaultNamespace('href')]: req.url,
            },
            ...owner,
          },
        },
      },
      { suppressEmptyNode: true },
      'prop',
    );

    res.set('Lock-Token', `<${lockToken}>`);
    res.set('Content-Type', 'application/xml; charset="utf-8"');
    res.status(200).send(lockDiscoveryXml);
  };
}
