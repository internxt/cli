import { WebDavMethodHandler } from '../../types/webdav.types';
import { NotImplementedError } from '../../utils/errors.utils';

export class MKCOLRequestHandler implements WebDavMethodHandler {
  async handle() {
    throw new NotImplementedError('MKCOL is not implemented yet.');
  }
}
