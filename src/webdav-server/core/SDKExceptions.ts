export class NoEnvDefined extends Error {
  constructor(envProperty: string) {
    super('ENV variable ' + envProperty + ' is not defined');

    Object.setPrototypeOf(this, NoEnvDefined.prototype);
  }
}
