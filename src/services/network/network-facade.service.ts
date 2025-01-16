import { Network } from '@internxt/sdk';
import * as NetworkUpload from '@internxt/sdk/dist/network/upload';
import * as NetworkDownload from '@internxt/sdk/dist/network/download';
import {
  DecryptFileFunction,
  DownloadFileFunction,
  EncryptFileFunction,
  UploadFileFunction,
  UploadFileMultipartFunction,
} from '@internxt/sdk/dist/network';
import { Environment } from '@internxt/inxt-js';
import { randomBytes } from 'node:crypto';
import { Readable, Transform } from 'node:stream';
import {
  DownloadOptions,
  UploadOptions,
  UploadProgressCallback,
  DownloadProgressCallback,
  UploadMultipartOptions,
  UploadTask,
} from '../../types/network.types';
import { CryptoService } from '../crypto.service';
import { UploadService } from './upload.service';
import { DownloadService } from './download.service';
import { ValidationService } from '../validation.service';
import { HashStream } from '../../utils/hash.utils';
import { RangeOptions } from '../../utils/network.utils';
import { queue, QueueObject } from 'async';

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
    size: number,
    to: WritableStream,
    rangeOptions?: RangeOptions,
    options?: DownloadOptions,
  ): Promise<[Promise<void>, AbortController]> {
    const encryptedContentStreams: ReadableStream<Uint8Array>[] = [];
    let fileStream: ReadableStream<Uint8Array>;
    const abortable = options?.abortController ?? new AbortController();

    const onProgress: DownloadProgressCallback = (loadedBytes: number) => {
      if (!options?.progressCallback) return;
      const reportedProgress = Math.round((loadedBytes / size) * 100);
      options.progressCallback(reportedProgress);
    };

    const decryptFile: DecryptFileFunction = async (_, key, iv) => {
      let startOffsetByte;
      if (rangeOptions) {
        startOffsetByte = rangeOptions.parsed.start;
      }
      fileStream = this.cryptoService.decryptStream(
        encryptedContentStreams,
        Buffer.from(key as ArrayBuffer),
        Buffer.from(iv as ArrayBuffer),
        startOffsetByte,
      );

      await fileStream.pipeTo(to);
    };

    const downloadFile: DownloadFileFunction = async (downloadables) => {
      if (rangeOptions && downloadables.length > 1) {
        throw new Error('Multi-Part Download with Range-Requests is not implemented');
      }

      for (const downloadable of downloadables) {
        if (abortable.signal.aborted) {
          throw new Error('Download aborted');
        }

        const encryptedContentStream = await this.downloadService.downloadFile(downloadable.url, {
          progressCallback: onProgress,
          abortController: options?.abortController,
          rangeHeader: rangeOptions?.range,
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
    let hash: Buffer;

    const onProgress: UploadProgressCallback = (loadedBytes: number) => {
      if (!options?.progressCallback) return;
      const reportedProgress = Math.round((loadedBytes / size) * 100);
      options.progressCallback(reportedProgress);
    };

    const encryptFile: EncryptFileFunction = async (_, key, iv) => {
      const encryptionCipher = this.cryptoService.getEncryptionTransform(
        Buffer.from(key as ArrayBuffer),
        Buffer.from(iv as ArrayBuffer),
      );
      encryptionTransform = from.pipe(encryptionCipher).pipe(hashStream);
    };

    const uploadFile: UploadFileFunction = async (url) => {
      await this.uploadService.uploadFile(url, encryptionTransform, {
        abortController: abortable,
        progressCallback: onProgress,
      });
      hash = hashStream.getHash();
      return hash.toString('hex');
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
        hash: hash,
      };
    };

    return [uploadOperation(), abortable];
  }

  /**
   * Performs a multi-part upload encrypting the stream content
   *
   * @param bucketId The bucket where the file will be uploaded
   * @param mnemonic The plain mnemonic of the user
   * @param size The total size of the stream content
   * @param from The source ReadStream to upload from
   * @param options The upload options
   * @returns A promise to execute the upload and an abort controller to cancel the upload
   */
  async uploadMultipartFromStream(
    bucketId: string,
    mnemonic: string,
    size: number,
    from: Readable,
    options: UploadMultipartOptions,
  ): Promise<[Promise<{ fileId: string; hash: Buffer }>, AbortController]> {
    const hashStream = new HashStream();
    const abortable = options?.abortController ?? new AbortController();
    let encryptionTransform: Transform;
    let hash: Buffer;

    const partsUploadedBytes: Record<number, number> = {};
    type Part = {
      PartNumber: number;
      ETag: string;
    };
    const fileParts: Part[] = [];

    const onProgress = (partId: number, loadedBytes: number) => {
      if (!options?.progressCallback) return;
      partsUploadedBytes[partId] = loadedBytes;
      const currentTotalLoadedBytes = Object.values(partsUploadedBytes).reduce((a, p) => a + p, 0);
      const reportedProgress = Math.round((currentTotalLoadedBytes / size) * 100);
      options.progressCallback(reportedProgress);
    };

    const encryptFile: EncryptFileFunction = async (_, key, iv) => {
      const encryptionCipher = this.cryptoService.getEncryptionTransform(
        Buffer.from(key as ArrayBuffer),
        Buffer.from(iv as ArrayBuffer),
      );
      const streamInParts = this.cryptoService.encryptStreamInParts(from, encryptionCipher, size, options.parts);
      encryptionTransform = streamInParts.pipe(hashStream);
    };

    const uploadFileMultipart: UploadFileMultipartFunction = async (urls: string[]) => {
      let partIndex = 0;
      const limitConcurrency = 6;

      const uploadPart = async (upload: UploadTask) => {
        const { etag } = await this.uploadService.uploadFile(upload.urlToUpload, upload.contentToUpload, {
          abortController: abortable,
          progressCallback: (loadedBytes: number) => {
            onProgress(upload.index, loadedBytes);
          },
        });

        fileParts.push({
          ETag: etag,
          PartNumber: upload.index + 1,
        });
      };

      const uploadQueue: QueueObject<UploadTask> = queue<UploadTask>(function (task, callback) {
        uploadPart(task)
          .then(() => {
            callback();
          })
          .catch((e) => {
            callback(e);
          });
      }, limitConcurrency);

      for await (const chunk of encryptionTransform) {
        const part: Buffer = chunk;

        if (uploadQueue.running() === limitConcurrency) {
          await uploadQueue.unsaturated();
        }

        if (abortable.signal.aborted) {
          throw new Error('Upload cancelled by user');
        }

        let errorAlreadyThrown = false;

        uploadQueue
          .pushAsync({
            contentToUpload: part,
            urlToUpload: urls[partIndex],
            index: partIndex++,
          })
          .catch((err: Error) => {
            if (errorAlreadyThrown) return;

            errorAlreadyThrown = true;
            if (err) {
              uploadQueue.kill();
              if (!abortable?.signal.aborted) {
                abortable.abort();
              }
            }
          });
      }

      while (uploadQueue.running() > 0 || uploadQueue.length() > 0) {
        await uploadQueue.drain();
      }

      hash = hashStream.getHash();
      const compareParts = (pA: Part, pB: Part) => pA.PartNumber - pB.PartNumber;
      const sortedParts = fileParts.sort(compareParts);
      return {
        hash: hash.toString('hex'),
        parts: sortedParts,
      };
    };

    const uploadOperation = async () => {
      const uploadResult = await NetworkUpload.uploadMultipartFile(
        this.network,
        this.cryptoLib,
        bucketId,
        mnemonic,
        size,
        encryptFile,
        uploadFileMultipart,
        options.parts,
      );

      return {
        fileId: uploadResult,
        hash: hash,
      };
    };

    return [uploadOperation(), abortable];
  }
}
