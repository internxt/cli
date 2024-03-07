import { mockReq, mockRes } from 'sinon-express-mock';
import { Request, Response } from 'express';
import { UserSettingsFixture } from './auth.fixture';

export function createWebDavRequestFixture<T extends object>(request: T): mockReq.MockReq & T & Request {
  const userSettings = UserSettingsFixture;
  return mockReq({
    // @ts-expect-error - User is not defined in the Request type from the sinon-express-mock package
    user: request.user ?? {
      rootFolderId: userSettings.root_folder_id,
    },
    ...request,
  });
}

export function createWebDavResponseFixture<T extends object>(response: T): mockRes.MockRes & T & Response {
  return mockRes(response);
}
