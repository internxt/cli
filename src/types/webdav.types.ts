import { Request, Response } from 'express';

export abstract class WebDavMethodHandler {
  abstract handle(request: Request, response: Response): Promise<void>;
}

export type WebDavMethodHandlerOptions = {
  debug: boolean;
};
