import { RequestHandler } from 'express';
import { ClientVersionUnsupportedError, ErrorUtils } from '../../utils/errors.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { UpdateUtils } from '../../utils/update.utils';

export class ClientVersionGate {
  private static blockedError?: ClientVersionUnsupportedError;

  // A blocked version is never supported again, so the block lasts until the process restarts
  static readonly getBlockedError = (): ClientVersionUnsupportedError | undefined => this.blockedError;

  static readonly block = (error: unknown): ClientVersionUnsupportedError => {
    const current = this.getBlockedError();
    if (current) return current;

    this.blockedError = ErrorUtils.toClientVersionUnsupportedError(error);
    const restartHint = UpdateUtils.isDockerRuntime()
      ? ''
      : ' After updating, restart the server with: internxt webdav restart.';
    webdavLogger.error(
      `[CLIENT VERSION] ${this.blockedError.message}.${restartHint} Requests are refused without reaching the API.`,
    );
    return this.blockedError;
  };

  static readonly reset = () => {
    this.blockedError = undefined;
  };
}

export const ClientVersionMiddleware: RequestHandler = (_req, _res, next) => {
  next(ClientVersionGate.getBlockedError());
};
