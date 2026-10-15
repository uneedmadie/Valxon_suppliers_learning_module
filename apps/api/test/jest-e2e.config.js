/**
 * Konfigurace end-to-end testů API (celý průchod přes HTTP s reálnou SQLite DB v dočasném adresáři).
 */
module.exports = {
  rootDir: '.',
  testRegex: '.*\\.e2e-spec\\.ts$',
  moduleFileExtensions: ['js', 'json', 'ts'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/../tsconfig.json' }] },
  testEnvironment: 'node',
  testTimeout: 120000,
};
