import packageJson from '../../package.json';

export class UpdateUtils {
  static readonly isDockerRuntime = (): boolean => process.env.INXT_RUNTIME === 'docker';

  static readonly getCurrentVersion = (): string => packageJson.version;

  static readonly getUpdateInstructions = (): string => {
    return this.isDockerRuntime()
      ? 'Pull the latest image with: docker pull internxt/webdav:latest'
      : 'Update with: npm install -g @internxt/cli@latest';
  };
}
