export async function getOpenpgp(): Promise<typeof import('openpgp')> {
  return import('openpgp');
}

export async function generateNewKeys(): Promise<{
  privateKeyArmored: string;
  publicKeyArmored: string;
  revocationCertificate: string;
}> {
  const openpgp = await getOpenpgp();

  const { privateKey, publicKey, revocationCertificate } = await openpgp.generateKey({
    userIDs: [{ email: 'inxt@inxt.com' }],
    curve: 'ed25519',
  });

  return {
    privateKeyArmored: privateKey,
    publicKeyArmored: Buffer.from(publicKey).toString('base64'),
    revocationCertificate: Buffer.from(revocationCertificate).toString('base64'),
  };
}
