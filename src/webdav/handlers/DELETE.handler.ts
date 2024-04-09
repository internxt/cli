import { WebDavMethodHandler } from '../../types/webdav.types';
import { NotImplementedError } from '../../utils/errors.utils';

export class DELETERequestHandler implements WebDavMethodHandler {
  async handle() {
    throw new NotImplementedError('DELETE is not implemented yet.');
  }
}
