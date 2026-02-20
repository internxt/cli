import { aes } from '@internxt/lib';
import * as openpgp from 'openpgp';
import { CryptoUtils } from '../utils/crypto.utils';
import kemBuilder from '@dashlane/pqc-kem-kyber512-node';

const WORDS_HYBRID_MODE_IN_BASE64 = 'SHlicmlkTW9kZQ=='; // 'HybridMode' in BASE64 format

export class KeysService {
  public static readonly instance: KeysService = new KeysService();

  /**
   * Encrypts a private key using a password
   * @param privateKey The plain private key
   * @param password The password to encrypt
   * @returns The encrypted private key
   **/
  public encryptPrivateKey = (privateKey: string, password: string): string => {
    return aes.encrypt(privateKey, password, CryptoUtils.getAesInit());
  };

  /**
   * Decrypts a private key using a password
   * @param privateKey The encrypted private key
   * @param password The password used to encrypt the private key
   * @returns The decrypted private key
   **/
  public decryptPrivateKey = (privateKey: string, password: string): string => {
    return aes.decrypt(privateKey, password);
  };

  /**
   * Generates pgp keys adding an AES-encrypted private key property by using a password
   * @param password The password for encrypting the private key
   * @returns The keys { privateKeyArmored, privateKeyArmoredEncrypted, publicKeyArmored, revocationCertificate }
   * @async
   **/
  public generateNewKeysWithEncrypted = async (password: string) => {
    const { privateKey, publicKey, revocationCertificate } = await openpgp.generateKey({
      userIDs: [{ email: 'inxt@inxt.com' }],
      curve: 'ed25519Legacy',
    });

    return {
      privateKeyArmored: privateKey,
      privateKeyArmoredEncrypted: this.encryptPrivateKey(privateKey, password),
      publicKeyArmored: Buffer.from(publicKey).toString('base64'),
      revocationCertificate: Buffer.from(revocationCertificate).toString('base64'),
    };
  };

  /**
   * Decrypts ciphertext using hybrid method (ecc and kyber) if kyber key is given, else uses ecc only
   * @param {string} encryptedMessageInBase64 - The encrypted message
   * @param {string} privateKeyInBase64 - The ecc private key in Base64
   * @param {string=}[privateKyberKeyInBase64] - The kyber private key in Base64
   * @returns {Promise<string>} The encrypted message.
   */
  public hybridDecryptMessageWithPrivateKey = async ({
    encryptedMessageInBase64,
    privateKeyInBase64,
    privateKyberKeyInBase64,
  }: {
    encryptedMessageInBase64: string;
    privateKeyInBase64: string;
    privateKyberKeyInBase64?: string;
  }): Promise<string> => {
    let eccCiphertextStr = encryptedMessageInBase64;
    let kyberSecret: Uint8Array<ArrayBufferLike> | undefined;
    const ciphertexts = encryptedMessageInBase64.split('$');
    const prefix = ciphertexts[0];
    const isHybridMode = prefix === WORDS_HYBRID_MODE_IN_BASE64;

    if (isHybridMode) {
      if (!privateKyberKeyInBase64) {
        throw new Error('Attempted to decrypt hybrid ciphertex without Kyber key');
      }
      const kem = await kemBuilder();

      const kyberCiphertextBase64 = ciphertexts[1];
      eccCiphertextStr = ciphertexts[2];

      const privateKyberKey = Buffer.from(privateKyberKeyInBase64, 'base64');
      const kyberCiphertext = Buffer.from(kyberCiphertextBase64, 'base64');
      const decapsulate = await kem.decapsulate(new Uint8Array(kyberCiphertext), new Uint8Array(privateKyberKey));
      kyberSecret = decapsulate.sharedSecret;
    }

    const decryptedMessage = await this.decryptMessageWithPrivateKey({
      encryptedMessage: atob(eccCiphertextStr),
      privateKeyInBase64,
    });

    if (isHybridMode && kyberSecret) {
      const bits = decryptedMessage.length * 4;
      const secretHex = await CryptoUtils.extendSecret(kyberSecret, bits);
      const xored = CryptoUtils.XORhex(decryptedMessage, secretHex);
      return Buffer.from(xored, 'hex').toString('utf8');
    }

    return decryptedMessage;
  };

  private readonly decryptMessageWithPrivateKey = async ({
    encryptedMessage,
    privateKeyInBase64,
  }: {
    encryptedMessage: string;
    privateKeyInBase64: string;
  }): Promise<string> => {
    const privateKeyArmored = Buffer.from(privateKeyInBase64, 'base64').toString();
    const privateKey = await openpgp.readPrivateKey({ armoredKey: privateKeyArmored });

    const message = await openpgp.readMessage({
      armoredMessage: encryptedMessage,
    });

    if (!this.comparePrivateKeyCiphertextIDs(privateKey, message)) {
      throw new Error('The key does not correspond to the ciphertext');
    }
    const { data: decryptedMessage } = await openpgp.decrypt({
      message,
      decryptionKeys: privateKey,
    });

    return decryptedMessage.toString();
  };

  private readonly comparePrivateKeyCiphertextIDs = (
    privateKey: openpgp.PrivateKey,
    encryptedMessage: openpgp.Message<string>,
  ): boolean => {
    const messageKeyID = encryptedMessage.getEncryptionKeyIDs()[0].toHex();
    const privateKeyID = privateKey.getSubkeys()[0].getKeyID().toHex();
    return messageKeyID === privateKeyID;
  };
}
