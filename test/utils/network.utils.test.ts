import { expect } from 'chai';
import { NetworkUtils } from '../../src/utils/network.utils';

describe('Network utils', () => {
  it('When obtaining auth credentials, should return the password as a SHA256 hash', async () => {
    const result = NetworkUtils.getAuthFromCredentials({
      user: 'test',
      pass: 'password123!',
    });

    expect(result.password).to.be.equal('5751a44782594819e4cb8aa27c2c9d87a420af82bc6a5a05bc7f19c3bb00452b');
  });
});
