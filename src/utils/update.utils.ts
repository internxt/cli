import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import type { ClientCompatibility } from '../services/client-compatibility.service';
import packageJson from '../../package.json';

dayjs.extend(utc);

export class UpdateUtils {
  static readonly isDockerRuntime = (): boolean => process.env.INXT_RUNTIME === 'docker';

  static readonly getCurrentVersion = (): string => packageJson.version;

  static readonly getUpdateInstructions = (): string => {
    return this.isDockerRuntime()
      ? 'Pull the latest image with: docker pull internxt/webdav:latest'
      : 'Update with: npm install -g @internxt/cli@latest';
  };

  static readonly getVersionDetails = (recommendedVersion?: string): string => {
    const recommended = recommendedVersion ? `, recommended version: ${recommendedVersion}` : '';
    return `Installed version: ${this.getCurrentVersion()}${recommended}.`;
  };

  static readonly getOutdatedWarning = ({
    status,
    message,
    recommendedVersion,
    sunsetAt,
  }: ClientCompatibility): string => {
    const deprecated = status === 'deprecated';
    const fallback = deprecated
      ? 'This version of the Internxt CLI is deprecated.'
      : 'A newer version of the Internxt CLI is available.';
    return [
      message || fallback,
      this.getVersionDetails(recommendedVersion),
      deprecated && this.getSunsetNotice(sunsetAt),
      this.getUpdateInstructions(),
    ]
      .filter(Boolean)
      .join(' ');
  };

  private static readonly getSunsetNotice = (sunsetAt?: string): string | undefined => {
    const date = dayjs.utc(sunsetAt);
    if (!sunsetAt || !date.isValid()) return undefined;

    const formatted = date.format('D MMMM, YYYY');
    return date.isAfter(dayjs())
      ? `It will stop working on ${formatted}.`
      : `It was scheduled to stop working on ${formatted}.`;
  };
}
