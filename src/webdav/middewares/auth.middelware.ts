import { Authorizer } from 'express-basic-auth';

export const webDavAuthHandler: Authorizer = () => {
  return false;
};
