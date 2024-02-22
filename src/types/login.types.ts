import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

export interface LoginCredentials {
  user: UserSettings;
  token: string;
  newToken: string;
  mnemonic: string;
}

export class NotValidEmailError extends Error {
  constructor() {
    super('Email is not valid');

    Object.setPrototypeOf(this, NotValidEmailError.prototype);
  }
}

export class EmptyPasswordError extends Error {
  constructor() {
    super('Password can not be empty');

    Object.setPrototypeOf(this, EmptyPasswordError.prototype);
  }
}

export class NotValidTwoFactorCodeError extends Error {
  constructor() {
    super('Two factor auth code is not valid (it must be 6 digit long)');

    Object.setPrototypeOf(this, NotValidTwoFactorCodeError.prototype);
  }
}
