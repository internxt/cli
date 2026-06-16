import eslintConfigInternxt from '@internxt/eslint-config-internxt';

export default [
  {
    ignores: ['dist', 'tmp', 'scripts'],
  },
  ...eslintConfigInternxt,
  {
    files: ['test/**/*.test.ts'],
    rules: {
      'max-len': 'off',
    },
  },
];
