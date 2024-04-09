import { WebDavMethodHandler } from '../../types/webdav.types';
import { NotImplementedError } from '../../utils/errors.utils';

export class COPYRequestHandler implements WebDavMethodHandler {
  async handle() {
    throw new NotImplementedError('COPY is not implemented yet.');
  }
}
