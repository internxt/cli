import { expect, test } from '@oclif/test';

describe('Auth check hook', () => {
  test
    .stdout()
    .hook('prerun', { id: 'upload', name: 'Upload' })
    .do((output) => {
      return expect(output.stdout).to.contain('Checking credentials');
    })
    .it('Shows an error message when credentials are missing');
});
