import { CryptoProvider } from '@internxt/sdk';
import { Keys, Password } from '@internxt/sdk/dist/auth';
import crypto, { Cipher, createCipheriv, createDecipheriv, createHash } from 'crypto';
import { KeysService } from './keys.service';
import { ConfigService } from '../services/config.service';
import { StreamUtils } from '../utils/stream.utils';

export class CryptoService {
  public static readonly instance: CryptoService = new CryptoService();

  public static readonly cryptoProvider: CryptoProvider = {
    encryptPasswordHash(password: Password, encryptedSalt: string): string {
      const salt = CryptoService.instance.decryptText(encryptedSalt);
      const hashObj = CryptoService.instance.passToHash({ password, salt });
      return CryptoService.instance.encryptText(hashObj.hash);
    },
    async generateKeys(password: Password): Promise<Keys> {
      const { privateKeyArmoredEncrypted, publicKeyArmored, revocationCertificate } =
        await KeysService.instance.generateNewKeysWithEncrypted(password);
      const keys: Keys = {
        privateKeyEncrypted: privateKeyArmoredEncrypted,
        publicKey: publicKeyArmored,
        revocationCertificate: revocationCertificate,
      };
      return keys;
    },
  };

  /**
   * Generates the hash for a password, if salt is provided it uses it, in other case it is generated from crypto
   * @param passObject The object containing the password and an optional salt hex encoded
   * @returns The hashed password and the salt
   **/
  public passToHash = (passObject: { password: string; salt?: string | null }): { salt: string; hash: string } => {
    const salt = passObject.salt ? passObject.salt : crypto.randomBytes(128 / 8).toString('hex');
    const hash = crypto
      .pbkdf2Sync(passObject.password, Buffer.from(salt, 'hex'), 10000, 256 / 8, 'sha1')
      .toString('hex');
    const hashedObjetc = {
      salt,
      hash,
    };
    return hashedObjetc;
  };

  /**
   * Encrypts a plain message into an AES encrypted text using APP_CRYPTO_SECRET value from env
   * @param textToEncrypt The plain text to be encrypted
   * @returns The encrypted string in 'hex' encoding
   **/
  public encryptText = (textToEncrypt: string): string => {
    const APP_CRYPTO_SECRET = ConfigService.instance.get('APP_CRYPTO_SECRET');
    return this.encryptTextWithKey(textToEncrypt, APP_CRYPTO_SECRET);
  };

  /**
   * Decrypts an AES encrypted text using APP_CRYPTO_SECRET value from env
   * @param encryptedText The AES encrypted text in 'HEX' encoding
   * @returns The decrypted string in 'utf8' encoding
   **/
  public decryptText = (encryptedText: string): string => {
    const APP_CRYPTO_SECRET = ConfigService.instance.get('APP_CRYPTO_SECRET');
    return this.decryptTextWithKey(encryptedText, APP_CRYPTO_SECRET);
  };

  /**
   * Encrypts a plain message into an AES encrypted text using a secret.
   * [Crypto.JS compatible]:
   * First 8 bytes are reserved for 'Salted__', next 8 bytes are the salt, and the rest is aes content
   * @param textToEncrypt The plain text to be encrypted
   * @param secret The secret used to encrypt
   * @returns The encrypted private string in 'hex' encoding
   **/
  public encryptTextWithKey = (textToEncrypt: string, secret: string) => {
    const salt = crypto.randomBytes(8);
    const { key, iv } = this.getKeyAndIvFrom(secret, salt);

    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    const encrypted = Buffer.concat([cipher.update(textToEncrypt, 'utf8'), cipher.final()]);

    /* CryptoJS applies the OpenSSL format for the ciphertext, i.e. the encrypted data starts with the ASCII 
    encoding of 'Salted__' followed by the salt and then the ciphertext.
    Therefore the beginning of the Base64 encoded ciphertext starts always with U2FsdGVkX1
    */
    const openSSLstart = Buffer.from('Salted__');

    return Buffer.concat([openSSLstart, salt, encrypted]).toString('hex');
  };

  /**
   * Decrypts an AES encrypted text using a secret.
   * [Crypto.JS compatible]:
   * First 8 bytes are reserved for 'Salted__', next 8 bytes are the salt, and the rest is aes content
   * @param encryptedText The AES encrypted text in 'HEX' encoding
   * @param secret The secret used to encrypt
   * @returns The decrypted string in 'utf8' encoding
   **/
  public decryptTextWithKey = (encryptedText: string, secret: string) => {
    const cypherText = Buffer.from(encryptedText, 'hex');

    const salt = cypherText.subarray(8, 16);
    const { key, iv } = this.getKeyAndIvFrom(secret, salt);

    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

    const contentsToDecrypt = cypherText.subarray(16);

    return Buffer.concat([decipher.update(contentsToDecrypt), decipher.final()]).toString('utf8');
  };

  private encryptReadable(readable: ReadableStream<Uint8Array>, cipher: Cipher): ReadableStream<Uint8Array> {
    const reader = readable.getReader();

    const encryptedFileReadable = new ReadableStream({
      async start(controller) {
        let done = false;

        while (!done) {
          const status = await reader.read();

          if (!status.done) {
            controller.enqueue(cipher.update(status.value));
          }

          done = status.done;
        }
        controller.close();
      },
    });

    return encryptedFileReadable;
  }

  public async decryptStream(inputSlices: ReadableStream<Uint8Array>[], key: Buffer, iv: Buffer) {
    const decipher = createDecipheriv('aes-256-ctr', key, iv);
    const encryptedStream = StreamUtils.joinReadableBinaryStreams(inputSlices);

    let keepReading = true;

    const decryptedStream = new ReadableStream({
      async pull(controller) {
        if (!keepReading) return;

        const reader = encryptedStream.getReader();
        const status = await reader.read();

        if (status.done) {
          controller.close();
        } else {
          controller.enqueue(decipher.update(status.value));
        }

        reader.releaseLock();
      },
      cancel() {
        keepReading = false;
      },
    });

    return decryptedStream;
  }

  public async encryptStream(
    input: ReadableStream<Uint8Array>,
    key: Buffer,
    iv: Buffer,
  ): Promise<{ blob: Blob; hash: Buffer }> {
    const cipher = createCipheriv('aes-256-ctr', key, iv);

    const readable = this.encryptReadable(input, cipher).getReader();
    const hasher = createHash('sha256');
    const blobParts: ArrayBuffer[] = [];

    let done = false;

    while (!done) {
      const status = await readable.read();

      if (!status.done) {
        hasher.update(status.value);
        blobParts.push(status.value);
      }

      done = status.done;
    }

    return {
      blob: new Blob(blobParts, { type: 'application/octet-stream' }),
      hash: createHash('ripemd160').update(Buffer.from(hasher.digest())).digest(),
    };
  }

  /**
   * Generates the key and the iv by transforming a secret and a salt.
   * It will generate the same key and iv if the same secret and salt is used.
   * This function is needed to be Crypto.JS compatible and encrypt/decrypt without errors
   * @param secret The secret used to encrypt
   * @param salt The salt used to encrypt
   * @returns The key and the iv resulted from the secret and the salt combination
   **/
  private getKeyAndIvFrom = (secret: string, salt: Buffer) => {
    const TRANSFORM_ROUNDS = 3;
    const password = Buffer.concat([Buffer.from(secret, 'binary'), salt]);
    const md5Hashes = [];
    let digest = password;

    for (let i = 0; i < TRANSFORM_ROUNDS; i++) {
      md5Hashes[i] = crypto.createHash('md5').update(digest).digest();
      digest = Buffer.concat([md5Hashes[i], password]);
    }

    const key = Buffer.concat([md5Hashes[0], md5Hashes[1]]);
    const iv = md5Hashes[2];
    return { key, iv };
  };
}
