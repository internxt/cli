import { WebDavMethodHandler } from '../../types/webdav.types';
import { NotImplementedError } from '../../utils/errors.utils';

export class MOVERequestHandler implements WebDavMethodHandler {
  async handle() {
    throw new NotImplementedError('MOVE is not implemented yet.');
  }
}
