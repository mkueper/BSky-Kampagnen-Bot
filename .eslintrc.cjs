/*
 * ESLint-Konfiguration für Backend (Node) und Dashboard (React)
 *
 * Installation lokal empfohlen:
 *   npm i -D eslint eslint-plugin-import eslint-plugin-react eslint-plugin-react-hooks
 *
 * Alternativ global installieren und per npm script ausführen (siehe package.json).
 */

/** @type {import('eslint').Linter.Config} */
module.exports = {
  root: true,
  env: { node: true, es2023: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'script' },
  extends: [
    'eslint:recommended',
  ],
  plugins: ['import'],
  rules: {
    'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
    'no-undef': 'error',
  },
  settings: {},

  overrides: [
    // Dashboard (React)
    {
      files: ['dashboard/src/**/*.{js,jsx}'],
      env: { browser: true, es2023: true },
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
      extends: [
        'eslint:recommended',
        'plugin:react/recommended',
        'plugin:react-hooks/recommended',
      ],
      plugins: ['react', 'react-hooks', 'import'],
      rules: {
        'react/prop-types': 'off',
        'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      },
      settings: { react: { version: 'detect' } },
    },
  ],
};

