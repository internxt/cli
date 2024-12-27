import { UserFixture } from './auth.fixture';
import { LoginCredentials } from '../../src/types/command.types';
import { SdkManagerApiSecurity } from '../../src/services/sdk-manager.service';
import Chance from 'chance';
import { LoginDetails } from '@internxt/sdk';

const randomDataGenerator = new Chance();

export const UserLoginFixture: LoginDetails = {
  email: UserFixture.email,
  password: randomDataGenerator.string({ length: 32 }),
  tfaCode: randomDataGenerator.natural({ min: 0, max: 999999 }).toString().padStart(6, '0'),
};

export const ApiSecurityFixture: SdkManagerApiSecurity = {
  newToken: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
  token: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
};

export const UserCredentialsFixture: LoginCredentials = {
  user: UserFixture,
  token: ApiSecurityFixture.token,
  newToken: ApiSecurityFixture.newToken,
  lastLoggedInAt: randomDataGenerator.date().toISOString(),
  lastTokenRefreshAt: randomDataGenerator.date().toISOString(),
};
