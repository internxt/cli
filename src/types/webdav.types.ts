import { Request, Response } from 'express';
import { ParsedPath } from 'path';

export abstract class WebDavMethodHandler {
  abstract handle(request: Request, response: Response): Promise<void>;
}

export type WebDavMethodHandlerOptions = {
  debug: boolean;
};

export type WebDavRequestedResource = {
  type: 'file' | 'folder' | 'root';
  url: string;
  name: string;
  path: ParsedPath;
};
