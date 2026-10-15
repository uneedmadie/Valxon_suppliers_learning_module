/**
 * ESLint konfigurace frontendu: pravidla Next.js (core web vitals) + TypeScript.
 */
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

const config = [
  ...nextVitals,
  ...nextTs,
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      // Obrázky pocházejí z webů dodavatelů (různé domény) – záměrně bez next/image optimalizace.
      '@next/next/no-img-element': 'off',
    },
  },
];

export default config;
