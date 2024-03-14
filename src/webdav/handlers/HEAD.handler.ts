import { WebDavMethodHandler } from '../../types/webdav.types';
import { Request, Response } from 'express';
export class HEADRequestHandler implements WebDavMethodHandler {
  async handle(req: Request, res: Response) {
    // This is a NOOP request handler, clients like CyberDuck uses this.
    res.status(405).send();
  }
}
