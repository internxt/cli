import crypto from 'crypto';
import { UserFixture } from './auth.fixture';
import { CLICredentials } from '../../src/types/command.types';

export const UserLoginFixture = {
  email: 'test@inxt.com',
  password: crypto.randomBytes(16).toString('hex'),
  twoFactor: crypto.randomInt(0, 6).toString().padStart(6, '0'),
};

export const UserCredentialsFixture: CLICredentials = {
  user: { ...UserFixture, email: UserLoginFixture.email },
  token: crypto.randomBytes(16).toString('hex'),
  newToken: crypto.randomBytes(16).toString('hex'),
  mnemonic: crypto.randomBytes(16).toString('hex'),
  root_folder_uuid: crypto.randomBytes(16).toString('hex'),
};
