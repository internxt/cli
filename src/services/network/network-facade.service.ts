import { Network } from '@internxt/sdk';
import * as NetworkUpload from '@internxt/sdk/dist/network/upload';

import { Environment } from '@internxt/inxt-js';
import { CryptoUtils } from '../../utils/crypto.utils';
import crypto from 'crypto';
import { UploadOptions, UploadProgressCallback } from '../../types/network.types';
import { EncryptFileFunction, UploadFileFunction } from '@internxt/sdk/dist/network';
import { CryptoService } from '../crypto.service';
import { UploadService } from './upload.service';
import { ReadStream } from 'fs';
import { StreamUtils } from '../../utils/stream.utils';
import { ValidationService } from '../validation.service';

export class NetworkFacade {
  private readonly cryptoLib: Network.Crypto;

  constructor(
    private readonly network: Network.Network,
    private readonly uploadService: UploadService,
    private readonly cryptoService: CryptoService,
  ) {
    this.cryptoLib = {
      algorithm: Network.ALGORITHMS.AES256CTR,
      validateMnemonic: (mnemonic) => {
        return ValidationService.instance.validateMnemonic(mnemonic);
      },
      generateFileKey: (mnemonic, bucketId, index) => {
        return Environment.utils.generateFileKey(mnemonic, bucketId, index as Buffer);
      },
      randomBytes: crypto.randomBytes,
    };
  }

  async uploadFromStream(
    bucketId: string,
    mnemonic: string,
    size: number,
    from: ReadStream,
    options: UploadOptions,
  ): Promise<[Promise<{ fileId: string }>, AbortController]> {
    const abortable = options.abortController ?? new AbortController();
    let fileHash: Buffer;
    let encryptedBlob: Blob;

    const onProgress: UploadProgressCallback = (progress: number) => {
      if (!options.progressCallback) return;
      options.progressCallback(progress);
    };

    const fileReadableStream = StreamUtils.readStreamToReadableStream(from);
    const encryptFile: EncryptFileFunction = async (_, key, iv) => {
      const { blob, hash } = await this.cryptoService.encryptStream(
        fileReadableStream,
        Buffer.from(key as ArrayBuffer),
        Buffer.from(iv as ArrayBuffer),
      );

      fileHash = hash;
      encryptedBlob = blob;
    };

    const uploadFile: UploadFileFunction = async (url) => {
      await this.uploadService.uploadFile(url, encryptedBlob, {
        abortController: abortable,
        progressCallback: onProgress,
      });

      return fileHash.toString('hex');
    };
    const uploadOperation = async () => {
      const uploadResult = await NetworkUpload.uploadFile(
        this.network,
        this.cryptoLib,
        bucketId,
        mnemonic,
        size,
        encryptFile,
        uploadFile,
      );

      return {
        fileId: uploadResult,
        hash: fileHash,
      };
    };

    return [uploadOperation(), abortable];
  }
}
