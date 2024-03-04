import express from 'express';
import dotenv from 'dotenv';
import { ConfigService } from '../services/config.service';
import { OPTIONSRequestHandler } from './handlers/OPTIONS.handler';
import { PROPFINDRequestHandler } from './handlers/PROPFIND.handler';
import { webdavLogger } from '../utils/logger.utils';
import bodyParser from 'body-parser';
import { SdkManager } from '../services/sdk-manager.service';
dotenv.config();

const initUserCredentials = async () => {
  const credentials = await ConfigService.instance.readUser();
  if (!credentials) throw new Error('Missing credentials, cannot init WebDav server');
  SdkManager.init({
    token: credentials?.token,
    newToken: credentials?.newToken,
  });
};
export const startWebDavServer = async () => {
  await initUserCredentials();

  const port = ConfigService.instance.get('WEBDAV_SERVER_PORT');
  const app = express();

  app.use(bodyParser.text({ type: ['application/xml', 'text/xml'] }));
  app.options('/webdav', new OPTIONSRequestHandler({ debug: true }).handle);
  app.propfind('/webdav', new PROPFINDRequestHandler({ debug: true }).handle);

  app.listen(port, () => {
    webdavLogger.info(`WebDAV server listening at http://localhost:${port}`);
  });
};

startWebDavServer()
  .then()
  .catch((error) => {
    console.error('Failed to start WebDAV server: ', error);
  });
