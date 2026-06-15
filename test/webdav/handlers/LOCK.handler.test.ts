import { describe, expect, it, vi } from 'vitest';
import { LOCKRequestHandler } from '../../../src/webdav/handlers/LOCK.handler';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';

describe('LOCK request handler', () => {
  it('should return 200 with a valid lock token header and content type', async () => {
    const requestHandler = new LOCKRequestHandler();

    const request = createWebDavRequestFixture({
      method: 'LOCK',
      url: '/file.txt',
    });
    const response = createWebDavResponseFixture({
      status: vi.fn().mockReturnThis(),
    });
    const setSpy = vi.spyOn(response, 'set');
    const sendSpy = vi.spyOn(response, 'send');

    await requestHandler.handle(request, response);

    expect(response.status).toHaveBeenCalledWith(200);
    expect(setSpy).toHaveBeenCalledWith('Lock-Token', expect.stringMatching(/^<opaquelocktoken:/));
    expect(setSpy).toHaveBeenCalledWith('Content-Type', 'application/xml; charset="utf-8"');

    const headerToken = setSpy.mock.calls.find((c) => c[0] === 'Lock-Token')?.[1] as string;
    const token = headerToken.slice(1, -1);
    const expectedXml =
      '<?xml version="1.0" encoding="utf-8" ?><D:prop xmlns:D="DAV:"><D:lockdiscovery><D:activelock>' +
      '<D:locktype><D:write/></D:locktype><D:lockscope><D:exclusive/></D:lockscope><D:depth>0</D:depth>' +
      `<D:timeout>Second-300</D:timeout><D:locktoken><D:href>${token}</D:href></D:locktoken>` +
      '<D:lockroot><D:href>/file.txt</D:href></D:lockroot></D:activelock>' +
      '</D:lockdiscovery></D:prop>';
    expect(sendSpy.mock.calls[0]?.[0]).toBe(expectedXml);
  });

  it('should include default depth 0 and timeout in the XML response body', async () => {
    const requestHandler = new LOCKRequestHandler();

    const request = createWebDavRequestFixture({
      method: 'LOCK',
      url: '/file.txt',
    });
    const response = createWebDavResponseFixture({});
    const setSpy = vi.spyOn(response, 'set');
    const sendSpy = vi.spyOn(response, 'send');

    await requestHandler.handle(request, response);

    const headerToken = setSpy.mock.calls.find((c) => c[0] === 'Lock-Token')?.[1] as string;
    const token = headerToken.slice(1, -1);
    const expectedXml =
      '<?xml version="1.0" encoding="utf-8" ?><D:prop xmlns:D="DAV:"><D:lockdiscovery><D:activelock>' +
      '<D:locktype><D:write/></D:locktype><D:lockscope><D:exclusive/></D:lockscope><D:depth>0</D:depth>' +
      `<D:timeout>Second-300</D:timeout><D:locktoken><D:href>${token}</D:href></D:locktoken>` +
      '<D:lockroot><D:href>/file.txt</D:href></D:lockroot></D:activelock>' +
      '</D:lockdiscovery></D:prop>';
    expect(sendSpy.mock.calls[0]?.[0]).toBe(expectedXml);
  });

  it('should use the depth and timeout from the request headers', async () => {
    const requestHandler = new LOCKRequestHandler();

    const request = createWebDavRequestFixture({
      method: 'LOCK',
      url: '/folder/',
      headers: {
        depth: 'Infinity',
        timeout: 'Second-600',
      },
    });
    const response = createWebDavResponseFixture({});
    const setSpy = vi.spyOn(response, 'set');
    const sendSpy = vi.spyOn(response, 'send');

    await requestHandler.handle(request, response);

    const headerToken = setSpy.mock.calls.find((c) => c[0] === 'Lock-Token')?.[1] as string;
    const token = headerToken.slice(1, -1);
    const expectedXml =
      '<?xml version="1.0" encoding="utf-8" ?><D:prop xmlns:D="DAV:"><D:lockdiscovery><D:activelock>' +
      '<D:locktype><D:write/></D:locktype><D:lockscope><D:exclusive/></D:lockscope><D:depth>Infinity</D:depth>' +
      `<D:timeout>Second-600</D:timeout><D:locktoken><D:href>${token}</D:href></D:locktoken>` +
      '<D:lockroot><D:href>/folder/</D:href></D:lockroot></D:activelock>' +
      '</D:lockdiscovery></D:prop>';
    expect(sendSpy.mock.calls[0]?.[0]).toBe(expectedXml);
  });

  it('should generate a unique lock token on each request', async () => {
    const requestHandler = new LOCKRequestHandler();

    const request = createWebDavRequestFixture({
      method: 'LOCK',
      url: '/file.txt',
    });
    const response1 = createWebDavResponseFixture({});
    const response2 = createWebDavResponseFixture({});
    const setSpy1 = vi.spyOn(response1, 'set');
    const setSpy2 = vi.spyOn(response2, 'set');

    await requestHandler.handle(request, response1);
    await requestHandler.handle(request, response2);

    const token1 = setSpy1.mock.calls.find((c) => c[0] === 'Lock-Token')?.[1];
    const token2 = setSpy2.mock.calls.find((c) => c[0] === 'Lock-Token')?.[1];

    expect(token1).not.toBe(token2);
  });

  it('should echo back the owner from the request body', async () => {
    const requestHandler = new LOCKRequestHandler();

    const request = createWebDavRequestFixture({
      method: 'LOCK',
      url: '/file.txt',
      body:
        '<?xml version="1.0" encoding="utf-8"?><D:lockinfo xmlns:D="DAV:"><D:lockscope><D:exclusive/>' +
        '</D:lockscope><D:locktype><D:write/></D:locktype><D:owner><D:href>http://example.com/users/test</D:href>' +
        '</D:owner></D:lockinfo>',
    });
    const response = createWebDavResponseFixture({});
    const setSpy = vi.spyOn(response, 'set');
    const sendSpy = vi.spyOn(response, 'send');

    await requestHandler.handle(request, response);

    const headerToken = setSpy.mock.calls.find((c) => c[0] === 'Lock-Token')?.[1] as string;
    const token = headerToken.slice(1, -1);
    const expectedXml =
      '<?xml version="1.0" encoding="utf-8" ?><D:prop xmlns:D="DAV:"><D:lockdiscovery><D:activelock>' +
      '<D:locktype><D:write/></D:locktype><D:lockscope><D:exclusive/></D:lockscope><D:depth>0</D:depth>' +
      `<D:timeout>Second-300</D:timeout><D:locktoken><D:href>${token}</D:href></D:locktoken>` +
      '<D:lockroot><D:href>/file.txt</D:href></D:lockroot>' +
      '<D:owner><D:href>http://example.com/users/test</D:href></D:owner></D:activelock>' +
      '</D:lockdiscovery></D:prop>';
    expect(sendSpy.mock.calls[0]?.[0]).toBe(expectedXml);
  });

  it('should handle request body without owner gracefully', async () => {
    const requestHandler = new LOCKRequestHandler();

    const request = createWebDavRequestFixture({
      method: 'LOCK',
      url: '/file.txt',
      body: 'invalid xml',
    });
    const response = createWebDavResponseFixture({});
    const setSpy = vi.spyOn(response, 'set');
    const sendSpy = vi.spyOn(response, 'send');

    await requestHandler.handle(request, response);

    const headerToken = setSpy.mock.calls.find((c) => c[0] === 'Lock-Token')?.[1] as string;
    const token = headerToken.slice(1, -1);
    const expectedXml =
      '<?xml version="1.0" encoding="utf-8" ?><D:prop xmlns:D="DAV:"><D:lockdiscovery><D:activelock>' +
      '<D:locktype><D:write/></D:locktype><D:lockscope><D:exclusive/></D:lockscope><D:depth>0</D:depth>' +
      `<D:timeout>Second-300</D:timeout><D:locktoken><D:href>${token}</D:href></D:locktoken>` +
      '<D:lockroot><D:href>/file.txt</D:href></D:lockroot></D:activelock>' +
      '</D:lockdiscovery></D:prop>';
    expect(sendSpy.mock.calls[0]?.[0]).toBe(expectedXml);
  });

  it('should return valid DAV: XML structure', async () => {
    const requestHandler = new LOCKRequestHandler();

    const request = createWebDavRequestFixture({
      method: 'LOCK',
      url: '/file.txt',
    });
    const response = createWebDavResponseFixture({});
    const setSpy = vi.spyOn(response, 'set');
    const sendSpy = vi.spyOn(response, 'send');

    await requestHandler.handle(request, response);

    const headerToken = setSpy.mock.calls.find((c) => c[0] === 'Lock-Token')?.[1] as string;
    const token = headerToken.slice(1, -1);
    const expectedXml =
      '<?xml version="1.0" encoding="utf-8" ?><D:prop xmlns:D="DAV:"><D:lockdiscovery><D:activelock>' +
      '<D:locktype><D:write/></D:locktype><D:lockscope><D:exclusive/></D:lockscope><D:depth>0</D:depth>' +
      `<D:timeout>Second-300</D:timeout><D:locktoken><D:href>${token}</D:href></D:locktoken>` +
      '<D:lockroot><D:href>/file.txt</D:href></D:lockroot></D:activelock>' +
      '</D:lockdiscovery></D:prop>';
    expect(sendSpy.mock.calls[0]?.[0]).toBe(expectedXml);
  });
});
