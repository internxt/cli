import { expect } from 'chai';
import { ErrorHandlingMiddleware } from '../../../src/webdav/middewares/errors.middleware';
import sinon from 'sinon';
import { createWebDavRequestFixture, createWebDavResponseFixture } from '../../fixtures/webdav.fixture';
import { NotFoundError } from '../../../src/utils/errors.utils';

describe('Error handling middleware', () => {
  const sandbox = sinon.createSandbox();
  afterEach(() => {
    sandbox.restore();
  });
  it('When a not found error is received, should respond with a 404', () => {
    const error = new NotFoundError('Item not found');
    const res = createWebDavResponseFixture({});
    const req = createWebDavRequestFixture({});

    ErrorHandlingMiddleware(error, req, res, () => {});

    expect(res.status.calledOnceWithExactly(404)).to.be.true;
    expect(
      res.send.calledOnceWithExactly({
        error: {
          message: 'Item not found',
        },
      }),
    ).to.be.true;
  });

  it('When something that does not have status code arrives, should return a 500 status code', () => {
    const error = new TypeError('Cannot read property "id" of undefined');
    const res = createWebDavResponseFixture({});
    const req = createWebDavRequestFixture({});

    ErrorHandlingMiddleware(error, req, res, () => {});

    expect(res.status.calledOnceWithExactly(500)).to.be.true;
    expect(
      res.send.calledOnceWithExactly({
        error: {
          message: 'Cannot read property "id" of undefined',
        },
      }),
    ).to.be.true;
  });
});
