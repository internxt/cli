import { expect } from 'chai';
import { WebDavUtils } from '../../src/utils/webdav.utils';
import { createWebDavRequestFixture } from '../fixtures/webdav.fixture';
import { getDriveDatabaseManager } from '../fixtures/drive-database.fixture';

describe('Webdav utils', () => {
  it('When a list of path components are given, should generate a correct href', () => {
    const href = WebDavUtils.joinURL('/path', 'to', 'file');
    expect(href).to.equal('/path/to/file');
  });

  it('When a list of path components are given, should generate a correct href and remove incorrect characters', () => {
    const href = WebDavUtils.joinURL('/path', 'to', 'folder/');
    expect(href).to.equal('/path/to/folder/');
  });

  it('When a request is given, should generate the requested resource', async () => {
    const request = createWebDavRequestFixture({
      url: '/url/to/folder/',
    });
    const resource = await WebDavUtils.getRequestedResource(request, getDriveDatabaseManager());
    expect(resource).to.deep.equal({
      url: '/url/to/folder/',
      type: 'folder',
      name: 'folder',
      path: {
        base: 'folder',
        dir: '/url/to',
        ext: '',
        name: 'folder',
        root: '/',
      },
    });
  });
});
