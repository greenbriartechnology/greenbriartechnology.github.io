import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import astro from 'eslint-plugin-astro';
import globals from 'globals';

// Flat config (plain array). Order matters: base JS rules, then TS, then Astro.
export default [
  {
    ignores: [
      'dist/',
      '.astro/',
      'node_modules/',
      'playwright-report/',
      'test-results/',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.browser },
    },
  },
];
