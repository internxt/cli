import { aes } from '@internxt/lib';
import { isValidKey } from '../utils/pgp.utils';
import { ConfigService } from './config.service';
import { OpenpgpService } from './pgp.service';

class Base64EncodedPrivateKeyError extends Error {
  constructor() {
    super('Key is encoded in base64');

    Object.setPrototypeOf(this, Base64EncodedPrivateKeyError.prototype);
  }
}

class WrongIterationsToEncryptPrivateKeyError extends Error {
  constructor() {
    super('Key was encrypted using the wrong iterations number');

    Object.setPrototypeOf(this, WrongIterationsToEncryptPrivateKeyError.prototype);
  }
}

class CorruptedEncryptedPrivateKeyError extends Error {
  constructor() {
    super('Key is corrupted');

    Object.setPrototypeOf(this, CorruptedEncryptedPrivateKeyError.prototype);
  }
}

class KeysDoNotMatchError extends Error {
  constructor() {
    super('Keys do not match');

    Object.setPrototypeOf(this, CorruptedEncryptedPrivateKeyError.prototype);
  }
}

export class KeysService {
  public static readonly instance: KeysService = new KeysService();

  public assertPrivateKeyIsValid = async (privateKey: string, password: string): Promise<void> => {
    let privateKeyDecrypted: string;

    try {
      privateKeyDecrypted = this.decryptPrivateKey(privateKey, password);
    } catch {
      try {
        aes.decrypt(privateKey, password, 9999);
      } catch {
        throw new CorruptedEncryptedPrivateKeyError();
      }

      throw new WrongIterationsToEncryptPrivateKeyError();
    }

    const hasValidFormat = await isValidKey(privateKeyDecrypted);

    if (!hasValidFormat) throw new Base64EncodedPrivateKeyError();
  };

  public decryptPrivateKey = (privateKey: string, password: string): string => {
    return aes.decrypt(privateKey, password);
  };

  public assertValidateKeys = async (privateKey: string, publicKey: string): Promise<void> => {
    const publicKeyArmored = await OpenpgpService.openpgp.readKey({ armoredKey: publicKey });
    const privateKeyArmored = await OpenpgpService.openpgp.readPrivateKey({ armoredKey: privateKey });

    const plainMessage = 'validate-keys';
    const originalText = await OpenpgpService.openpgp.createMessage({ text: plainMessage });
    const encryptedMessage = await OpenpgpService.openpgp.encrypt({
      message: originalText,
      encryptionKeys: publicKeyArmored,
    });

    const decryptedMessage = (
      await OpenpgpService.openpgp.decrypt({
        message: await OpenpgpService.openpgp.readMessage({ armoredMessage: encryptedMessage }),
        verificationKeys: publicKeyArmored,
        decryptionKeys: privateKeyArmored,
      })
    ).data;

    if (decryptedMessage !== plainMessage) {
      throw new KeysDoNotMatchError();
    }
  };

  public getAesInitFromEnv = (): { iv: string; salt: string } => {
    const MAGIC_IV = ConfigService.instance.get('REACT_APP_MAGIC_IV');
    const MAGIC_SALT = ConfigService.instance.get('REACT_APP_MAGIC_SALT');

    return { iv: MAGIC_IV as string, salt: MAGIC_SALT as string };
  };
}
