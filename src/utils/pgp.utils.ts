import { OpenpgpService } from '../services/pgp.service';

export const isValidKey = async (key: string): Promise<boolean> => {
  try {
    await OpenpgpService.openpgp.readKey({ armoredKey: key });
    return true;
  } catch (error) {
    return false;
  }
};
