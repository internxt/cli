import eslintConfigInternxt from '@internxt/eslint-config-internxt';

export default [
    {
        ignores: ['dist', 'tmp', 'scripts'],
    },
    ...eslintConfigInternxt,
    {
        rules: {
            'no-console': 'off',
            'max-len': 'off',
            '@typescript-eslint/no-empty-function': 'off',
        }
    }
];
