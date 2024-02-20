import * as NetworkUpload from '@internxt/sdk/dist/network/upload';

import { NetworkFacade } from '../../../src/services/network/network-facade.service';
import { SdkManager } from '../../../src/services/sdk-manager.service';
import path from 'path';
import { createReadStream } from 'fs';
import sinon, { SinonSandbox } from 'sinon';
import { expect } from 'chai';
import { UploadService } from '../../../src/services/network/upload.service';
import { CryptoService } from '../../../src/services/crypto.service';
describe('Network Facade Service', () => {
  let networkFacadeSandbox: SinonSandbox;

  beforeEach(() => {
    networkFacadeSandbox = sinon.createSandbox();
  });

  afterEach(() => {
    networkFacadeSandbox.restore();
  });
  const getNetworkMock = () => {
    return SdkManager.instance.getNetwork({
      user: 'user',
      pass: 'pass',
    });
  };
  it('When a file is prepared to upload, should return an abort controller and a promise to execute the upload', async () => {
    const sut = new NetworkFacade(getNetworkMock(), UploadService.instance, CryptoService.instance);
    const file = path.join(process.cwd(), 'test/fixtures/test-content.fixture.txt');
    const readStream = createReadStream(file);
    const options = {
      progressCallback: sinon.stub(),
      abortController: new AbortController(),
    };

    const result = await sut.uploadFromStream(
      'f1858bc9675f9e4f7ab29429',
      'animal fog wink trade december thumb sight cousin crunch plunge captain enforce letter creek text',
      100,
      readStream,
      options,
    );

    expect(result[0]).to.be.instanceOf(Promise);
    expect(result[1]).to.be.instanceOf(AbortController);
  });

  it('When a file is uploaded, should return the fileId', async () => {
    const sut = new NetworkFacade(getNetworkMock(), UploadService.instance, CryptoService.instance);
    const file = path.join(process.cwd(), 'test/fixtures/test-content.fixture.txt');
    const readStream = createReadStream(file);
    const options = {
      progressCallback: sinon.stub(),
      abortController: new AbortController(),
    };

    networkFacadeSandbox.stub(NetworkUpload, 'uploadFile').resolves('uploaded_file_id');
    const [executeUpload] = await sut.uploadFromStream(
      'f1858bc9675f9e4f7ab29429',
      'animal fog wink trade december thumb sight cousin crunch plunge captain enforce letter creek text',
      100,
      readStream,
      options,
    );

    const uploadResult = await executeUpload;

    expect(uploadResult.fileId).to.be.equal('uploaded_file_id');
  });

  it('When a file is uploaded, should return the fileId', async () => {
    const network = getNetworkMock();
    const upload = UploadService.instance;
    const sut = new NetworkFacade(network, upload, CryptoService.instance);
    const file = path.join(process.cwd(), 'test/fixtures/test-content.fixture.txt');
    const readStream = createReadStream(file);
    const options = {
      progressCallback: sinon.stub(),
      abortController: new AbortController(),
    };

    networkFacadeSandbox.stub(upload, 'uploadFile').resolves({ etag: 'file-etag' });

    networkFacadeSandbox.stub(network, 'startUpload').resolves({
      uploads: [
        {
          index: 0,
          uuid: 'upload-uuid',
          url: 'https://example.com/upload-url',
          urls: [],
        },
      ],
    });

    networkFacadeSandbox.stub(network, 'finishUpload').resolves({
      id: 'uploaded_file_id',
      index: 'file-index',
      bucket: 'bucket-id',
      name: 'test-content',
      mimetype: 'text/plain',
      created: new Date(),
    });
    const [executeUpload] = await sut.uploadFromStream(
      'f1858bc9675f9e4f7ab29429',
      'animal fog wink trade december thumb sight cousin crunch plunge captain enforce letter creek text',
      100,
      readStream,
      options,
    );

    const uploadResult = await executeUpload;

    expect(uploadResult.fileId).to.be.equal('uploaded_file_id');
  });
});
