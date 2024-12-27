import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import Chance from 'chance';
import { generateMnemonic } from 'bip39';

const randomDataGenerator = new Chance();

export const UserFixture: UserSettings = {
  userId: randomDataGenerator.natural({ min: 1 }).toString(),
  uuid: randomDataGenerator.guid({ version: 4 }),
  email: randomDataGenerator.email(),
  name: randomDataGenerator.name(),
  lastname: randomDataGenerator.name(),
  username: randomDataGenerator.word(),
  bridgeUser: randomDataGenerator.email(),
  bucket: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
  backupsBucket: randomDataGenerator.string({ length: 24, pool: 'abcdef0123456789' }),
  root_folder_id: randomDataGenerator.natural({ min: 1 }),
  rootFolderId: randomDataGenerator.guid({ version: 4 }),
  rootFolderUuid: randomDataGenerator.guid({ version: 4 }),
  sharedWorkspace: false,
  credit: randomDataGenerator.natural({ min: 1, max: 9999 }),
  mnemonic: generateMnemonic(),
  privateKey: randomDataGenerator.string({
    length: randomDataGenerator.integer({ min: 500, max: 1000 }),
    pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  }),
  publicKey: randomDataGenerator.string({
    length: randomDataGenerator.integer({ min: 500, max: 1000 }),
    pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  }),
  revocationKey: randomDataGenerator.string({
    length: randomDataGenerator.integer({ min: 500, max: 1000 }),
    pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  }),
  teams: false,
  appSumoDetails: null,
  registerCompleted: true,
  hasReferralsProgram: false,
  createdAt: randomDataGenerator.date(),
  avatar: randomDataGenerator.url(),
  emailVerified: true,
  keys: {
    ecc: {
      privateKey: randomDataGenerator.string({
        length: randomDataGenerator.integer({ min: 500, max: 1000 }),
        pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      }),
      publicKey: randomDataGenerator.string({
        length: randomDataGenerator.integer({ min: 500, max: 1000 }),
        pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      }),
      revocationKey: randomDataGenerator.string({
        length: randomDataGenerator.integer({ min: 500, max: 1000 }),
        pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      }),
    },
    kyber: {
      privateKyberKey: randomDataGenerator.string({
        length: randomDataGenerator.integer({ min: 500, max: 1000 }),
        pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      }),
      publicKyberKey: randomDataGenerator.string({
        length: randomDataGenerator.integer({ min: 500, max: 1000 }),
        pool: 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      }),
    },
  },
};

export const UserSettingsFixture: UserSettings = {
  userId: UserFixture.userId,
  email: UserFixture.email,
  name: UserFixture.name,
  lastname: UserFixture.lastname,
  username: UserFixture.username,
  bridgeUser: UserFixture.bridgeUser,
  bucket: UserFixture.bucket,
  backupsBucket: UserFixture.backupsBucket,
  root_folder_id: UserFixture.root_folder_id,
  rootFolderId: UserFixture.rootFolderId,
  rootFolderUuid: UserFixture.rootFolderUuid,
  sharedWorkspace: UserFixture.sharedWorkspace,
  credit: UserFixture.credit,
  mnemonic: UserFixture.mnemonic,
  privateKey: UserFixture.privateKey,
  publicKey: UserFixture.publicKey,
  revocationKey: UserFixture.revocationKey,
  teams: UserFixture.teams,
  appSumoDetails: UserFixture.appSumoDetails,
  registerCompleted: UserFixture.registerCompleted,
  hasReferralsProgram: UserFixture.hasReferralsProgram,
  createdAt: UserFixture.createdAt,
  avatar: UserFixture.avatar,
  emailVerified: UserFixture.emailVerified,
  uuid: UserFixture.uuid,
  keys: {
    ecc: {
      privateKey: UserFixture.keys.ecc.privateKey,
      publicKey: UserFixture.keys.ecc.publicKey,
      revocationKey: UserFixture.keys.ecc.revocationKey,
    },
    kyber: {
      privateKyberKey: UserFixture.keys.kyber.privateKyberKey,
      publicKyberKey: UserFixture.keys.kyber.publicKyberKey,
    },
  },
};
