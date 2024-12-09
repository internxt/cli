import { Request, Response } from 'express';
import { ParsedPath } from 'node:path';

export abstract class WebDavMethodHandler {
  abstract handle(request: Request, response: Response): Promise<void>;
}

export type WebDavMethodHandlerOptions = {
  debug: boolean;
};

export type WebDavRequestedResource = {
  type: 'file' | 'folder';
  url: string;
  name: string;
  path: ParsedPath;
  parentPath: string;
};
