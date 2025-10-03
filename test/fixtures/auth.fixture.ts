import crypto from 'node:crypto';
import { LoginUserDetails } from '../../src/types/command.types';

export const UserFixture: LoginUserDetails = {
  userId: crypto.randomBytes(16).toString('hex'),
  uuid: crypto.randomBytes(16).toString('hex'),
  email: crypto.randomBytes(16).toString('hex'),
  name: crypto.randomBytes(16).toString('hex'),
  lastname: crypto.randomBytes(16).toString('hex'),
  username: crypto.randomBytes(16).toString('hex'),
  bridgeUser: crypto.randomBytes(16).toString('hex'),
  bucket: crypto.randomBytes(16).toString('hex'),
  rootFolderId: crypto.randomBytes(16).toString('hex'),
  mnemonic: crypto.randomBytes(16).toString('hex'),
  createdAt: new Date().toISOString(),
  avatar: crypto.randomBytes(16).toString('hex'),
  emailVerified: true,
  keys: {
    ecc: {
      privateKey: crypto.randomBytes(16).toString('hex'),
      publicKey: crypto.randomBytes(16).toString('hex'),
    },
    kyber: {
      privateKey: crypto.randomBytes(16).toString('hex'),
      publicKey: crypto.randomBytes(16).toString('hex'),
    },
  },
};

export const UserSettingsFixture: LoginUserDetails = {
  userId: UserFixture.userId,
  email: UserFixture.email,
  name: UserFixture.name,
  lastname: UserFixture.lastname,
  username: UserFixture.username,
  bridgeUser: UserFixture.bridgeUser,
  bucket: UserFixture.bucket,
  rootFolderId: UserFixture.rootFolderId,
  mnemonic: UserFixture.mnemonic,
  createdAt: UserFixture.createdAt,
  avatar: UserFixture.avatar,
  emailVerified: UserFixture.emailVerified,
  uuid: UserFixture.uuid,
  keys: {
    ecc: {
      privateKey: UserFixture.keys.ecc.privateKey,
      publicKey: UserFixture.keys.ecc.publicKey,
    },
    kyber: {
      privateKey: UserFixture.keys.kyber.privateKey,
      publicKey: UserFixture.keys.kyber.publicKey,
    },
  },
};
