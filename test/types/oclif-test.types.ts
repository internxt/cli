import { Config } from '@oclif/core/lib/interfaces';
import { Context } from 'fancy-test/lib/types';

export type OclifStdoutContext = { config: Config; expectation: string; returned: unknown } & {
  readonly stdout: string;
} & Context;
