import { expect } from 'chai';
import { HashStream } from '../../src/utils/hash.utils';
import sinon from 'sinon';

describe('Hash Utils', () => {
  let hashStream: HashStream;
  const sandbox = sinon.createSandbox();
  beforeEach(() => {
    hashStream = new HashStream();
  });

  afterEach(() => {
    sandbox.restore();
  });
  it('should update the hasher with data chunk on _transform call', (done) => {
    const spy = sandbox.spy(hashStream.hasher, 'update');
    const chunk = Buffer.from('Test data');

    hashStream._transform(chunk, 'utf8', () => {
      expect(spy.calledOnce).to.be.true;
      done();
    });
  });

  it('should correctly calculate hash on readHash call', (done) => {
    const testData = 'Some test data';
    hashStream.on('data', () => {});
    hashStream.on('end', () => {
      const readHash = hashStream.readHash();
      expect(readHash).to.be.instanceof(Buffer);
      expect(readHash.length).to.be.greaterThan(0);
      done();
    });

    hashStream.write(testData);
    hashStream.end();
  });
});
