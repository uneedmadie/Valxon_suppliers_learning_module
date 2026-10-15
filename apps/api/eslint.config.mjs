/**
 * ESLint konfigurace API: doporučená pravidla JS + typově podložená pravidla typescript-eslint.
 * Zakazuje implicitní/explicitní `any` a nebezpečné operace s nezúženými hodnotami.
 */
import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'eslint.config.mjs', 'jest.config.js', 'test/jest-e2e.config.js'] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node, ...globals.jest },
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      // Nest dekorované třídy (moduly) jsou záměrně prázdné.
      '@typescript-eslint/no-extraneous-class': 'off',
    },
  },
  {
    // Testy pracují s volnými JSON odpověďmi supertestu; striktní unsafe-* pravidla by zde jen zahlcovala.
    files: ['test/**/*.ts', 'src/**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/unbound-method': 'off',
    },
  },
);
