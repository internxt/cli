import { expect } from 'chai';
import crypto from 'crypto';
import { ConfigService } from '../../src/services/config.service';

import { config } from 'dotenv';
config();

const env = Object.assign({}, process.env);

describe('Config service', () => {
  beforeEach(() => {
    process.env = env;
  });

  after(() => {
    process.env = env;
  });

  it('When an env property is requested, then the get method return its value', async () => {
    const envKey = 'APP_CRYPTO_SECRET';
    const envValue = crypto.randomBytes(8).toString('hex');
    process.env[envKey] = envValue;

    const newEnvValue = ConfigService.instance.get(envKey);
    expect(newEnvValue).to.equal(envValue);
  });

  it('When an env property that do not have value is requested, then an error is thrown', async () => {
    const envKey = 'APP_CRYPTO_SECRET';
    process.env = {};

    try {
      ConfigService.instance.get(envKey);
      expect(false).to.be.true; //should throw error
    } catch (err) {
      const error = err as Error;
      expect(error.message).to.equal(`Config key ${envKey} was not found in process.env`);
    }
  });
});
