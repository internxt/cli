import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';
import { MkcolMiddleware } from '../../../src/webdav/middewares/mkcol.middleware';
import { fail } from 'node:assert';
import { UnsupportedMediaTypeError } from '../../../src/utils/errors.utils';

describe('MKCOL middleware', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('When MKCOL content is application/xml, then it should call next', () => {
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

  it('When MKCOL content is text/xml, then it should call next', () => {
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

  it('When MKCOL content is not XML, then it should call next with error', async () => {
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

  it('When MKCOL has body content, then it should call next with error', async () => {
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
