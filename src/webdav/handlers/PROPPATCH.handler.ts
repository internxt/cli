import { WebDavMethodHandler } from '../../types/webdav.types';
import { NotImplementedError } from '../../utils/errors.utils';

export class PROPPATCHRequestHandler implements WebDavMethodHandler {
  async handle() {
    throw new NotImplementedError('PROPPATCH is not implemented yet.');
  }
}
