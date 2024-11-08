import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';

export interface LoginCredentials {
  user: UserSettings;
  token: string;
  newToken: string;
  mnemonic: string;
}

export interface CLICredentials extends LoginCredentials {
  root_folder_uuid: string;
}

export interface WebdavConfig {
  port: string;
  protocol: 'http' | 'https';
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

export class NotValidFolderUuidError extends Error {
  constructor() {
    super('Folder UUID is not valid (it must be a valid v4 UUID)');

    Object.setPrototypeOf(this, NotValidFolderUuidError.prototype);
  }
}
export class NotValidFileUuidError extends Error {
  constructor() {
    super('File UUID is not valid (it must be a valid v4 UUID)');

    Object.setPrototypeOf(this, NotValidFileUuidError.prototype);
  }
}

export class NotValidItemUuidError extends Error {
  constructor() {
    super('Item UUID is not valid (it must be a valid v4 UUID)');

    Object.setPrototypeOf(this, NotValidItemUuidError.prototype);
  }
}

export class ItemNotFoundError extends Error {
  constructor() {
    super('Item not found');

    Object.setPrototypeOf(this, ItemNotFoundError.prototype);
  }
}

export class NoRootFolderIdFoundError extends Error {
  constructor() {
    super('No root folder id found on your account');

    Object.setPrototypeOf(this, NoRootFolderIdFoundError.prototype);
  }
}

export class MissingCredentialsError extends Error {
  constructor() {
    super('Missing credentials, login first');

    Object.setPrototypeOf(this, MissingCredentialsError.prototype);
  }
}

export class NotValidYesOrNoError extends Error {
  constructor() {
    super('Only yes or not -> ["yes", "no", "y", "n"] options are valid');

    Object.setPrototypeOf(this, NotValidYesOrNoError.prototype);
  }
}

export class EmptyItemNameError extends Error {
  constructor() {
    super('Item name can not be empty');

    Object.setPrototypeOf(this, EmptyPasswordError.prototype);
  }
}

export class NotValidPortError extends Error {
  constructor() {
    super('Port should be a number between 1 and 65535');

    Object.setPrototypeOf(this, NotValidPortError.prototype);
  }
}

export type PaginatedItem = {
  plainName: string;
  uuid: string;
  isFolder: boolean;
  type: string;
  size: bigint;
  updatedAt: Date;
};
