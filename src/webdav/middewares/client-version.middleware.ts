import { RequestHandler } from 'express';
import { ClientVersionUnsupportedError, ErrorUtils } from '../../utils/errors.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { UpdateUtils } from '../../utils/update.utils';

// Expires so a block lifted by the backend doesn't need a manual restart
export const BLOCK_RECHECK_MS = 5 * 60 * 1000;

export class ClientVersionGate {
  private static blockedError?: ClientVersionUnsupportedError;
  private static blockedAt = 0;

  static readonly getBlockedError = (): ClientVersionUnsupportedError | undefined => {
    if (this.blockedError && Date.now() - this.blockedAt >= BLOCK_RECHECK_MS) {
      this.reset();
    }
    return this.blockedError;
  };

  static readonly block = (error: unknown): ClientVersionUnsupportedError => {
    const current = this.getBlockedError();
    if (current) return current;

    this.blockedError = ErrorUtils.toClientVersionUnsupportedError(error);
    this.blockedAt = Date.now();
    const restartHint = UpdateUtils.isDockerRuntime()
      ? ''
      : ' After updating, restart the server with: internxt webdav restart.';
    webdavLogger.error(
      `[CLIENT VERSION] ${this.blockedError.message}${restartHint} ` +
        'Requests are refused without reaching the API, re-checking every 5 minutes.',
    );
    return this.blockedError;
  };

  static readonly reset = () => {
    this.blockedError = undefined;
    this.blockedAt = 0;
  };
}

export const ClientVersionMiddleware: RequestHandler = (_req, _res, next) => {
  next(ClientVersionGate.getBlockedError());
};
