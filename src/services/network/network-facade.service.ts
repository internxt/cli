import { Network } from '@internxt/sdk';
import * as NetworkUpload from '@internxt/sdk/dist/network/upload';
import * as NetworkDownload from '@internxt/sdk/dist/network/download';
import { Environment } from '@internxt/inxt-js';
import crypto, { createCipheriv } from 'crypto';
import {
  DownloadOptions,
  UploadOptions,
  ProgressCallback,
  UploadMultipartOptions,
  UploadTask,
} from '../../types/network.types';
import {
  DecryptFileFunction,
  DownloadFileFunction,
  EncryptFileFunction,
  UploadFileFunction,
  UploadFileMultipartFunction,
} from '@internxt/sdk/dist/network';
import { CryptoService } from '../crypto.service';
import { UploadService } from './upload.service';
import { DownloadService } from './download.service';
import { ValidationService } from '../validation.service';
import { QueueObject, queue } from 'async';

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
      randomBytes: crypto.randomBytes,
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

    const onProgress: ProgressCallback = (progress: number) => {
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
  async uploadFromStreamUsingBlob(
    bucketId: string,
    mnemonic: string,
    size: number,
    from: ReadableStream<Uint8Array>,
    options?: UploadOptions,
  ): Promise<[Promise<{ fileId: string; hash: Buffer }>, AbortController]> {
    const abortable = options?.abortController ?? new AbortController();
    let fileHash: Buffer;
    let encryptedBlob: Blob;

    const onProgress: ProgressCallback = (progress: number) => {
      if (!options?.progressCallback) return;
      options.progressCallback(progress);
    };

    const onUploadProgress = (progress: number) => {
      onProgress(progress * 0.9);
    };

    const encryptFile: EncryptFileFunction = async (_, key, iv) => {
      const { blob, hash } = await this.cryptoService.encryptStreamToFile(
        from,
        Buffer.from(key as ArrayBuffer),
        Buffer.from(iv as ArrayBuffer),
      );

      fileHash = hash;
      encryptedBlob = blob;
    };

    const uploadFile: UploadFileFunction = async (url) => {
      await this.uploadService.uploadFile(url, encryptedBlob, {
        abortController: abortable,
        progressCallback: onUploadProgress,
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

      onProgress(1);
      return {
        fileId: uploadResult,
        hash: fileHash,
      };
    };

    return [uploadOperation(), abortable];
  }

  /**
   * Performs a multipart upload encrypting the stream content
   *
   * @param bucketId The bucket where the file will be uploaded
   * @param mnemonic The plain mnemonic of the user
   * @param size The total size of the stream content
   * @param from The source ReadStream to upload from
   * @param options The upload multipart options
   * @returns A promise with the resulting fileId
   */
  async uploadMultipart(
    bucketId: string,
    mnemonic: string,
    size: number,
    from: ReadableStream<Uint8Array>,
    options: UploadMultipartOptions,
  ): Promise<string> {
    const partsUploadedBytes: Record<number, number> = {};

    function notifyProgress(partId: number, uploadedBytes: number) {
      partsUploadedBytes[partId] = uploadedBytes;

      const totalUploaded = Object.values(partsUploadedBytes).reduce((a, p) => a + p, 0);
      const progress = totalUploaded / size;

      options.uploadingCallback(progress);
    }

    const uploadsAbortController = new AbortController();
    options.abortController?.signal.addEventListener('abort', () => uploadsAbortController.abort());

    let realError: Error | null = null;
    let encryptedStream: ReadableStream<Uint8Array>;
    const fileParts: { PartNumber: number; ETag: string }[] = [];

    const encryptFile: EncryptFileFunction = async (algorithm, key, iv) => {
      const cipher = createCipheriv('aes-256-ctr', key as Buffer, iv as Buffer);
      encryptedStream = this.cryptoService.encryptStreamInParts(from, size, cipher, options.parts);
    };

    const uploadFileMultipart: UploadFileMultipartFunction = async (urls: string[]) => {
      let partIndex = 0;
      const limitConcurrency = 10;

      const worker = async (upload: UploadTask) => {
        const { etag } = await this.uploadService.uploadFile(upload.urlToUpload, upload.contentToUpload, {
          progressCallback: (progress) => {
            notifyProgress(upload.index, upload.contentToUpload.size * progress);
          },
          abortController: uploadsAbortController,
        });

        if (!etag) {
          throw new Error('ETag header was not returned');
        }
        fileParts.push({
          ETag: etag,
          PartNumber: upload.index + 1,
        });
      };

      const uploadQueue: QueueObject<UploadTask> = queue<UploadTask>(function (task, callback) {
        worker(task)
          .then(() => {
            callback();
          })
          .catch((e) => {
            callback(e);
          });
      }, limitConcurrency);

      const fileHash = await this.cryptoService.processEveryFileBlobReturnHash(encryptedStream, async (blob) => {
        if (uploadsAbortController.signal.aborted) {
          if (realError) throw realError;
          else throw new Error('Upload cancelled by user');
        }

        let errorAlreadyThrown = false;

        uploadQueue
          .pushAsync({
            contentToUpload: blob,
            urlToUpload: urls[partIndex],
            index: partIndex++,
          })
          .catch((err: Error) => {
            if (errorAlreadyThrown) return;

            errorAlreadyThrown = true;
            if (err) {
              uploadQueue.kill();
              if (!uploadsAbortController?.signal.aborted) {
                // Failed due to other reason, so abort requests
                uploadsAbortController.abort();
                // TODO: Do it properly with ```options.abortController?.abort(err.message);``` available from Node 17.2.0 in advance
                // https://github.com/node-fetch/node-fetch/issues/1462
                realError = err;
              }
            }
          });

        /**
         * TODO: Memory leak here, probably due to closures usage with this variable.
         * Pending to be solved, do not remove this line unless the leak is solved.
         */
        blob = new Blob([]);
      });

      while (uploadQueue.running() > 0 || uploadQueue.length() > 0) {
        await uploadQueue.drain();
      }

      return {
        hash: fileHash,
        parts: fileParts.sort((pA, pB) => pA.PartNumber - pB.PartNumber),
      };
    };
    return NetworkUpload.uploadMultipartFile(
      this.network,
      this.cryptoLib,
      bucketId,
      mnemonic,
      size,
      encryptFile,
      uploadFileMultipart,
      options.parts,
    );
  }
}
