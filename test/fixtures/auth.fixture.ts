import { UserSettings } from '@internxt/sdk/dist/shared/types/userSettings';
import crypto from 'crypto';

export const UserFixture: UserSettings = {
  userId: crypto.randomBytes(16).toString('hex'),
  uuid: crypto.randomBytes(16).toString('hex'),
  email: crypto.randomBytes(16).toString('hex'),
  name: crypto.randomBytes(16).toString('hex'),
  lastname: crypto.randomBytes(16).toString('hex'),
  username: crypto.randomBytes(16).toString('hex'),
  bridgeUser: crypto.randomBytes(16).toString('hex'),
  bucket: crypto.randomBytes(16).toString('hex'),
  backupsBucket: crypto.randomBytes(16).toString('hex'),
  root_folder_id: crypto.randomInt(1, 9999),
  rootFolderId: crypto.randomBytes(16).toString('hex'),
  rootFolderUuid: crypto.randomBytes(16).toString('hex'),
  sharedWorkspace: false,
  credit: crypto.randomInt(1, 9999),
  mnemonic: crypto.randomBytes(16).toString('hex'),
  privateKey: crypto.randomBytes(16).toString('hex'),
  publicKey: crypto.randomBytes(16).toString('hex'),
  revocationKey: crypto.randomBytes(16).toString('hex'),
  keys: {
    ecc: {
      privateKey: crypto.randomBytes(16).toString('hex'),
      publicKey: crypto.randomBytes(16).toString('hex'),
      revocationKey: crypto.randomBytes(16).toString('hex'),
    },
    kyber: {
      privateKyberKey: crypto.randomBytes(16).toString('hex'),
      publicKyberKey: crypto.randomBytes(16).toString('hex'),
    }
  },
  teams: false,
  appSumoDetails: null,
  registerCompleted: true,
  hasReferralsProgram: false,
  createdAt: new Date(),
  avatar: crypto.randomBytes(16).toString('hex'),
  emailVerified: true,
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
  keys: {
    ecc: {
      privateKey: UserFixture.keys.ecc.privateKey,
      publicKey: UserFixture.keys.ecc.publicKey,
      revocationKey: UserFixture.revocationKey,
    },
    kyber: {
      privateKyberKey: UserFixture.keys.kyber.privateKyberKey,
      publicKyberKey: UserFixture.keys.kyber.publicKyberKey,
    }
  },
  teams: UserFixture.teams,
  appSumoDetails: UserFixture.appSumoDetails,
  registerCompleted: UserFixture.registerCompleted,
  hasReferralsProgram: UserFixture.hasReferralsProgram,
  createdAt: UserFixture.createdAt,
  avatar: UserFixture.avatar,
  emailVerified: UserFixture.emailVerified,
  uuid: UserFixture.uuid,
};
