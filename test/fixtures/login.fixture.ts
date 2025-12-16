import { randomBytes, randomInt } from 'node:crypto';
import { UserFixture } from './auth.fixture';
import { LoginCredentials } from '../../src/types/command.types';
import { SdkManagerApiSecurity } from '../../src/services/sdk-manager.service';

export const UserLoginFixture = {
  email: `${randomBytes(8).toString('hex')}@${randomBytes(8).toString('hex')}.com`,
  password: randomBytes(16).toString('hex'),
  twoFactor: randomInt(0, 999999).toString().padStart(6, '0'),
};

export const ApiSecurityFixture: SdkManagerApiSecurity = {
  token: randomBytes(16).toString('hex'),
};

export const UserCredentialsFixture: LoginCredentials = {
  user: { ...UserFixture, email: UserLoginFixture.email },
  token: ApiSecurityFixture.token,
};
