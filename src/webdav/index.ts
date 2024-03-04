import dotenv from 'dotenv';
import { WebDavServer } from './webdav-server';

dotenv.config();

new WebDavServer().start().then().catch(console.error);
