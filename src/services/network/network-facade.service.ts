import { Network } from '@internxt/sdk';
import * as NetworkUpload from '@internxt/sdk/dist/network/upload';
import * as NetworkDownload from '@internxt/sdk/dist/network/download';
import {
  DecryptFileFunction,
  DownloadFileFunction,
  EncryptFileFunction,
  UploadFileFunction,
} from '@internxt/sdk/dist/network';
import { Environment } from '@internxt/inxt-js';
import { randomBytes } from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import { DownloadOptions, UploadOptions, UploadProgressCallback } from '../../types/network.types';
import { CryptoService } from '../crypto.service';
import { UploadService } from './upload.service';
import { DownloadService } from './download.service';
import { ValidationService } from '../validation.service';
import { HashStream } from '../../utils/hash.utils';
import { ProgressTransform } from '../../utils/stream.utils';

export class NetworkFacade {
  private readonly cryptoLib: Network.Crypto;

  constructor(
    private readonly network: Network.Network,
    private readonly uploadService: UploadService,
    private readonly downloadService: DownloadService,
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
      randomBytes: randomBytes,
    };
  }

  /**
   * Performs a download decrypting the stream content
   *
   * @param bucketId The bucket where the file will be uploaded
   * @param mnemonic The plain mnemonic of the user
   * @param fileId The file id referencing the network file
   * @param to A writableStream to write the decrypted content to
   * @param options The download options
   * @returns A promise to execute the download and an abort controller to cancel the download
   */
  async downloadToStream(
    bucketId: string,
    mnemonic: string,
    fileId: string,
    to: WritableStream,
    options?: DownloadOptions,
  ): Promise<[Promise<void>, AbortController]> {
    const encryptedContentStreams: ReadableStream<Uint8Array>[] = [];
    let fileStream: ReadableStream<Uint8Array>;
    const abortable = options?.abortController ?? new AbortController();

    const onProgress: UploadProgressCallback = (progress: number) => {
      if (!options?.progressCallback) return;
      options.progressCallback(progress);
    };

    const onDownloadProgress = (progress: number) => {
      onProgress(progress);
    };

    const decryptFile: DecryptFileFunction = async (_, key, iv) => {
      fileStream = await this.cryptoService.decryptStream(
        encryptedContentStreams,
        Buffer.from(key as ArrayBuffer),
        Buffer.from(iv as ArrayBuffer),
      );

      await fileStream.pipeTo(to);
    };

    const downloadFile: DownloadFileFunction = async (downloadables) => {
      for (const downloadable of downloadables) {
        if (abortable.signal.aborted) {
          throw new Error('Download aborted');
        }

        const encryptedContentStream = await this.downloadService.downloadFile(downloadable.url, {
          progressCallback: onDownloadProgress,
          abortController: options?.abortController,
        });

        encryptedContentStreams.push(encryptedContentStream);
      }
    };

    const downloadOperation = async () => {
      await NetworkDownload.downloadFile(
        fileId,
        bucketId,
        mnemonic,
        this.network,
        this.cryptoLib,
        Buffer.from,
        downloadFile,
        decryptFile,
      );
    };

    return [downloadOperation(), abortable];
  }

  /**
   * Performs an upload encrypting the stream content
   *
   * @param bucketId The bucket where the file will be uploaded
   * @param mnemonic The plain mnemonic of the user
   * @param size The total size of the stream content
   * @param from The source ReadStream to upload from
   * @param options The upload options
   * @returns A promise to execute the upload and an abort controller to cancel the upload
   */
  async uploadFromStream(
    bucketId: string,
    mnemonic: string,
    size: number,
    from: Readable,
    options?: UploadOptions,
  ): Promise<[Promise<{ fileId: string; hash: Buffer }>, AbortController]> {
    const hashStream = new HashStream();
    const abortable = options?.abortController ?? new AbortController();
    let encryptionTransform: Transform;
    const progressTransform = new ProgressTransform({ totalBytes: size }, (progress) => {
      if (options?.progressCallback) {
        options.progressCallback(progress * 0.95);
      }
    });

    const onProgress: UploadProgressCallback = (progress: number) => {
      if (!options?.progressCallback) return;
      options.progressCallback(progress);
    };

    const encryptFile: EncryptFileFunction = async (_, key, iv) => {
      encryptionTransform = from
        .pipe(
          await this.cryptoService.getEncryptionTransform(
            Buffer.from(key as ArrayBuffer),
            Buffer.from(iv as ArrayBuffer),
          ),
        )
        .pipe(hashStream);
    };

    const uploadFile: UploadFileFunction = async (url) => {
      await this.uploadService.uploadFile(url, encryptionTransform.pipe(progressTransform), {
        abortController: abortable,
        progressCallback: () => {
          // No progress here, we are using the progressTransform
        },
      });

      return hashStream.getHash().toString('hex');
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
      const fileHash: Buffer = Buffer.from('');

      onProgress(1);
      return {
        fileId: uploadResult,
        hash: fileHash,
      };
    };

    return [uploadOperation(), abortable];
  }
}
