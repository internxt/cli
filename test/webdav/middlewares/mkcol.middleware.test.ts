import { describe, expect, test, vi } from 'vitest';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';
import { MkcolMiddleware } from '../../../src/webdav/middewares/mkcol.middleware';
import { fail } from 'node:assert';
import { UnsupportedMediaTypeError } from '../../../src/utils/errors.utils';

describe('MKCOL middleware', () => {
  test('when the request content type is XML, then the middleware allows the request to proceed', () => {
    const req = createWebDavRequestFixture({
      method: 'MKCOL',
      url: '/anypath',
      headers: { 'Content-Type': 'application/xml' },
    });
    const res = createWebDavResponseFixture({});
    const next = vi.fn();

    MkcolMiddleware(req, res, next);

    expect(next).toHaveBeenCalledExactlyOnceWith();
  });

  test('when the request content type is text XML, then the middleware allows the request to proceed', () => {
    const req = createWebDavRequestFixture({
      method: 'MKCOL',
      url: '/anypath',
      headers: [{ 'Content-Type': 'text/xml' }],
    });
    const res = createWebDavResponseFixture({});
    const next = vi.fn();

    MkcolMiddleware(req, res, next);

    expect(next).toHaveBeenCalledExactlyOnceWith();
  });

  test('when the request content type is not XML, then the middleware rejects the request', async () => {
    const req = createWebDavRequestFixture({
      method: 'MKCOL',
      url: '/anypath',
      headers: { 'Content-Type': 'application/json' },
    });
    const res = createWebDavResponseFixture({});
    const next = vi.fn();

    try {
      await MkcolMiddleware(req, res, next);
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect(error).to.be.instanceOf(UnsupportedMediaTypeError);
    }
  });

  test('when the request has a body, then the middleware rejects the request', async () => {
    const req = createWebDavRequestFixture({
      method: 'MKCOL',
      url: '/anypath',
      headers: { 'Content-Type': 'text/xml' },
      body: '<?xml version="1.0" encoding="UTF-8"?><test></test>',
    });
    const res = createWebDavResponseFixture({});
    const next = vi.fn();

    try {
      await MkcolMiddleware(req, res, next);
      fail('Expected function to throw an error, but it did not.');
    } catch (error) {
      expect(error).to.be.instanceOf(UnsupportedMediaTypeError);
    }
  });
});
