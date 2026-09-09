import { beforeEach, describe, expect, test, vi } from 'vitest';
import { fail } from 'node:assert';
import { PROPPATCHRequestHandler } from '../../../src/webdav/handlers/PROPPATCH.handler';
import { WebDavUtils } from '../../../src/utils/webdav.utils';
import { XMLUtils } from '../../../src/utils/xml.utils';
import { NotFoundError } from '../../../src/utils/errors.utils';
import { newFileItem } from '../../fixtures/drive.fixture';
import {
  createWebDavRequestFixture,
  createWebDavResponseFixture,
  getRequestedFileResource,
} from '../../fixtures/webdav.fixture';
import { WebDavRequestedResource } from '../../../src/types/webdav.types';

describe('PROPPATCH request handler', () => {
  let sut: PROPPATCHRequestHandler;

  beforeEach(() => {
    sut = new PROPPATCHRequestHandler();
  });

  test('when the requested resource does not exist, then the server returns a not found error', async () => {
    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();

    const request = createWebDavRequestFixture({
      method: 'PROPPATCH',
      url: requestedFileResource.url,
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    const getRequestedResourceStub = vi
      .spyOn(WebDavUtils, 'getRequestedResource')
      .mockResolvedValue(requestedFileResource);
    const getDriveItemStub = vi.spyOn(WebDavUtils, 'getDriveItemFromResource').mockResolvedValue(undefined);

    try {
      await sut.handle(request, response);
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect(error).to.be.instanceOf(NotFoundError);
    }
    expect(getRequestedResourceStub).toHaveBeenCalledOnce();
    expect(getDriveItemStub).toHaveBeenCalledOnce();
  });

  test('when properties are patched on an existing resource, then the server rejects all of them with a 207', async () => {
    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();
    const fileItem = newFileItem();

    const body =
      '<?xml version="1.0" encoding="utf-8"?><D:propertyupdate xmlns:D="DAV:" xmlns:Z="urn:schemas-microsoft-com:">' +
      '<D:set><D:prop><Z:Win32LastModifiedTime>Mon, 01 Jan 2024 00:00:00 GMT</Z:Win32LastModifiedTime></D:prop>' +
      '</D:set><D:remove><D:prop><Z:Win32FileAttributes/></D:prop></D:remove></D:propertyupdate>';

    const request = createWebDavRequestFixture({
      method: 'PROPPATCH',
      url: requestedFileResource.url,
      body,
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });
    const setSpy = vi.spyOn(response, 'set');
    const sendSpy = vi.spyOn(response, 'send');

    vi.spyOn(WebDavUtils, 'getRequestedResource').mockResolvedValue(requestedFileResource);
    vi.spyOn(WebDavUtils, 'getDriveItemFromResource').mockResolvedValue(fileItem);

    await sut.handle(request, response);

    const expectedXml = XMLUtils.toWebDavXML(
      {
        [XMLUtils.addDefaultNamespace('response')]: {
          [XMLUtils.addDefaultNamespace('href')]: XMLUtils.encodeWebDavUri(requestedFileResource.url),
          [XMLUtils.addDefaultNamespace('propstat')]: {
            [XMLUtils.addDefaultNamespace('prop')]: {
              'Z:Win32LastModifiedTime': '',
              'Z:Win32FileAttributes': '',
            },
            [XMLUtils.addDefaultNamespace('status')]: 'HTTP/1.1 403 Forbidden',
          },
        },
      },
      { suppressEmptyNode: true },
    );

    expect(response.status).toHaveBeenCalledWith(207);
    expect(setSpy).toHaveBeenCalledWith('Content-Type', 'application/xml; charset="utf-8"');
    expect(sendSpy).toHaveBeenCalledWith(expectedXml);
  });

  test('when the same property is present in both set and remove, then it is only reported once', async () => {
    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();
    const fileItem = newFileItem();

    const body =
      '<?xml version="1.0" encoding="utf-8"?><D:propertyupdate xmlns:D="DAV:" xmlns:Z="urn:schemas-microsoft-com:">' +
      '<D:set><D:prop><Z:Win32LastModifiedTime/></D:prop></D:set>' +
      '<D:remove><D:prop><Z:Win32LastModifiedTime/></D:prop></D:remove></D:propertyupdate>';

    const request = createWebDavRequestFixture({
      method: 'PROPPATCH',
      url: requestedFileResource.url,
      body,
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });
    const sendSpy = vi.spyOn(response, 'send');

    vi.spyOn(WebDavUtils, 'getRequestedResource').mockResolvedValue(requestedFileResource);
    vi.spyOn(WebDavUtils, 'getDriveItemFromResource').mockResolvedValue(fileItem);

    await sut.handle(request, response);

    const sentXml = sendSpy.mock.calls[0]?.[0] as string;
    // A single self-closing tag (suppressEmptyNode) means the property was reported only once.
    expect(sentXml.match(/Z:Win32LastModifiedTime/g)).toHaveLength(1);
  });

  test('when the request body has no parseable properties, then the server still responds with an empty 207 propstat', async () => {
    const requestedFileResource: WebDavRequestedResource = getRequestedFileResource();
    const fileItem = newFileItem();

    const request = createWebDavRequestFixture({
      method: 'PROPPATCH',
      url: requestedFileResource.url,
      body: 'not xml',
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnValue({ send: vi.fn() }),
    });

    vi.spyOn(WebDavUtils, 'getRequestedResource').mockResolvedValue(requestedFileResource);
    vi.spyOn(WebDavUtils, 'getDriveItemFromResource').mockResolvedValue(fileItem);

    await sut.handle(request, response);

    expect(response.status).toHaveBeenCalledWith(207);
  });
});
