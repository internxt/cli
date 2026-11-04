import { AxiosResponseError, AxiosUnknownError } from '@internxt/sdk/dist/shared/types/errors';
import { AxiosError } from 'axios';
import { CLIENT_VERSION_UNSUPPORTED } from '../../src/utils/errors.utils';

/** An error as @internxt/sdk's HttpClient raises it from a real API response. */
export const newApiError = (
  status: number,
  { requestId, request = 'GET files/meta', data = {} }: { requestId?: string; request?: string; data?: unknown } = {},
) =>
  new AxiosResponseError(`Request failed with status code ${status}`, request, {
    status,
    data,
    headers: requestId ? { 'x-request-id': requestId } : {},
    statusText: '',
    // @ts-expect-error partial AxiosResponse fixture, only the fields read by AxiosResponseError are needed
    config: {},
  });

/** The SDK's error when no response arrived; it invents a status -- 500 if sent, 400 if not. */
export const newNetworkError = ({ sent = true } = {}) =>
  new AxiosUnknownError('socket hang up', 'GET files/meta', { request: sent ? {} : undefined } as AxiosError);

export const newClientVersionUnsupportedError = ({
  message = 'This version of the app is no longer supported. Please update to a newer version.',
  recommendedVersion = '1.7.0' as string | null,
} = {}) =>
  newApiError(403, {
    data: {
      message,
      error: 'Forbidden',
      statusCode: 403,
      errorCode: CLIENT_VERSION_UNSUPPORTED,
      recommendedVersion,
    },
  });
