import { aes } from '@internxt/lib';
import { KeysService } from './keys.service';
import openpgp from 'openpgp';

export class OpenpgpService {
  public static readonly instance: OpenpgpService = new OpenpgpService();
  public static readonly openpgp: typeof import('openpgp') = openpgp;

  public generateNewKeysWithEncrypted = async (password: string) => {
    const { privateKeyArmored, publicKeyArmored, revocationCertificate } = await this.generateNewKeys();

    return {
      privateKeyArmored,
      privateKeyArmoredEncrypted: aes.encrypt(privateKeyArmored, password, KeysService.instance.getAesInitFromEnv()),
      publicKeyArmored,
      revocationCertificate,
    };
  };

  private generateNewKeys = async (): Promise<{
    privateKeyArmored: string;
    publicKeyArmored: string;
    revocationCertificate: string;
  }> => {
    const { privateKey, publicKey, revocationCertificate } = await OpenpgpService.openpgp.generateKey({
      userIDs: [{ email: 'inxt@inxt.com' }],
      curve: 'ed25519',
    });

    return {
      privateKeyArmored: privateKey,
      publicKeyArmored: Buffer.from(publicKey).toString('base64'),
      revocationCertificate: Buffer.from(revocationCertificate).toString('base64'),
    };
  };
}
