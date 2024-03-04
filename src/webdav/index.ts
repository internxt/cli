import dotenv from 'dotenv';
import { WebDavServer } from './webdav-server';
import express from 'express';
import { ConfigService } from '../services/config.service';
import { DriveFolderService } from '../services/drive/drive-folder.service';

dotenv.config();

new WebDavServer(express(), ConfigService.instance, DriveFolderService.instance).start().then().catch(console.error);
