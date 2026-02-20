import { WebDavMethodHandler } from '../../types/webdav.types';
import { Request, Response } from 'express';
import { WebDavUtils } from '../../utils/webdav.utils';
import { AuthService } from '../../services/auth.service';
import { NotFoundError } from '../../utils/errors.utils';
import { webdavLogger } from '../../utils/logger.utils';
import { NetworkUtils } from '../../utils/network.utils';
import { NotValidFileIdError } from '../../types/command.types';
import { CLIUtils } from '../../utils/cli.utils';

export class GETRequestHandler implements WebDavMethodHandler {
  handle = async (req: Request, res: Response) => {
    const resource = await WebDavUtils.getRequestedResource(req.url);

    webdavLogger.info(`[GET] Request received item at ${resource.url}`);
    const driveFile = await WebDavUtils.getDriveFileFromResource(resource.url);

    if (!driveFile) {
      throw new NotFoundError(
        `Resource not found on Internxt Drive at ${resource.url}, if trying to access a folder use PROPFIND instead.`,
      );
    }

    webdavLogger.info(`[GET] [${driveFile.uuid}] Found Drive File`);

    const { user } = await AuthService.instance.getAuthDetails();
    webdavLogger.info(`[GET] [${driveFile.uuid}] Network ready for download`);

    res.header('Content-Type', 'application/octet-stream');

    const fileSize = driveFile.size ?? 0;

    if (fileSize > 0) {
      const range = req.headers['range'];
      const rangeOptions = NetworkUtils.parseRangeHeader({
        range,
        totalFileSize: fileSize,
      });
      let contentLength = fileSize;
      if (rangeOptions) {
        webdavLogger.info(`[GET] [${driveFile.uuid}] Range request received:`, { rangeOptions });
        contentLength = rangeOptions.rangeSize;
      }
      res.header('Content-length', contentLength.toString());

      const writable = new WritableStream({
        write(chunk) {
          res.write(chunk);
        },
        close() {
          res.end();
        },
      });

      if (!driveFile.fileId) {
        throw new NotValidFileIdError();
      }

      const { networkFacade, bucket, mnemonic } = await CLIUtils.prepareNetwork(user);

      const [executeDownload] = await networkFacade.downloadToStream(
        bucket,
        mnemonic,
        driveFile.fileId,
        contentLength,
        writable,
        rangeOptions,
      );
      webdavLogger.info(`[GET] [${driveFile.uuid}] Download prepared, executing...`);

      /**
       * If the client doesn't receive a 200 status code, the download can be aborted.
       * We need to respond with status 200 while the file is being downloaded via streams
       * so the client can keep the connection open and receive the file completely.
       */
      res.status(200);

      await executeDownload;
      webdavLogger.info(`[GET] [${driveFile.uuid}] ✅ Download ready, replying to client`);
    } else {
      webdavLogger.info(`[GET] [${driveFile.uuid}] File is empty, replying to client with no content`);
      res.header('Content-length', '0');
      res.status(200);
      res.end();
    }
  };
}
