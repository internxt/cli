import { Network } from '@internxt/sdk';
import * as NetworkDownload from '@internxt/sdk/dist/network/download';
import { DecryptFileFunction, DownloadFileFunction } from '@internxt/sdk/dist/network';
import { Environment } from '@internxt/inxt-js';
import { randomBytes } from 'node:crypto';
import { Readable } from 'node:stream';
import { DownloadOptions, DownloadProgressCallback } from '../../types/network.types';
import { CryptoService } from '../crypto.service';
import { DownloadService } from './download.service';
import { ValidationService } from '../validation.service';
import { RangeOptions } from '../../utils/network.utils';
import { ActionState } from '@internxt/inxt-js/build/api';

export class NetworkFacade {
  private readonly cryptoLib: Network.Crypto;

  constructor(
    private readonly network: Network.Network,
    private readonly environment: Environment,
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
   * @param size The total size of the stream content
   * @param from The source ReadStream to upload from
   * @returns A promise to execute the upload and an abort controller to cancel the upload
   */
  uploadFile(
    from: Readable,
    size: number,
    bucketId: string,
    finishedCallback: (err: Error | null, res: string | null) => void,
    progressCallback: (progress: number) => void,
  ): ActionState {
    const minimumMultipartThreshold = 100 * 1024 * 1024;
    const useMultipart = size > minimumMultipartThreshold;

    if (useMultipart) {
      return this.environment.uploadMultipartFile(bucketId, {
        source: from,
        fileSize: size,
        finishedCallback,
        progressCallback,
      });
    } else {
      return this.environment.upload(bucketId, {
        source: from,
        fileSize: size,
        finishedCallback,
        progressCallback,
      });
    }
  }
}
