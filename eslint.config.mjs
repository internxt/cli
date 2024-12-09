import eslintConfigInternxt from '@internxt/eslint-config-internxt';

export default [
    {
        ignores: ['dist', 'tmp', 'scripts'],
    },
    ...eslintConfigInternxt,
    {
        rules: {
            'max-len': 'off',
        }
    }
];
