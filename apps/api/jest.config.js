/**
 * Konfigurace jednotkových testů API (Jest + ts-jest).
 * Spouští pouze *.spec.ts v src; end-to-end testy mají vlastní konfiguraci v test/.
 */
module.exports = {
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }] },
  testEnvironment: 'node',
};
