module.exports = {
    root: true,
    env: {
        browser: true,
        es2022: true,
        node: true,
    },
    parser: '@typescript-eslint/parser',
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
    },
    plugins: ['@typescript-eslint', 'react-hooks', 'react-refresh'],
    extends: ['eslint:recommended'],
    rules: {
        'no-undef': 'off',
        'no-unused-vars': 'off',
        'react-hooks/rules-of-hooks': 'error',
        'react-hooks/exhaustive-deps': 'error',
        'react-refresh/only-export-components': 'off',
    },
    ignorePatterns: ['dist/', 'node_modules/'],
}
