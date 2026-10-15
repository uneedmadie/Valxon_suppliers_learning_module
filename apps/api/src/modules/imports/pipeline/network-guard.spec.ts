/**
 * Testy SSRF ochrany: privátní/rezervované adresy a validace importovaných URL.
 */
import { isBlockedAddress } from './network-guard';
import { assertImportableUrl, FetchError } from './safe-http.client';

describe('isBlockedAddress', () => {
  it.each(['127.0.0.1', '10.1.2.3', '172.16.0.5', '192.168.1.1', '169.254.169.254', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:10.0.0.1', '100.64.0.1'])(
    'blokuje %s',
    (ip) => expect(isBlockedAddress(ip)).toBe(true),
  );

  it.each(['8.8.8.8', '151.101.1.69', '2a00:1450:4001:81b::200e'])('povolí veřejnou adresu %s', (ip) => {
    expect(isBlockedAddress(ip)).toBe(false);
  });
});

describe('assertImportableUrl', () => {
  const code = (url: string): string => {
    try {
      assertImportableUrl(url, false);
      return 'ok';
    } catch (e) {
      return e instanceof FetchError ? e.code : 'other';
    }
  };

  it('povolí běžnou https URL', () => expect(code('https://www.example.com/about')).toBe('ok'));
  it('odmítne jiný protokol', () => expect(code('file:///etc/passwd')).toBe('invalid_url'));
  it('odmítne přihlašovací údaje v URL', () => expect(code('https://user:pw@example.com/')).toBe('invalid_url'));
  it('odmítne localhost a privátní IP', () => {
    expect(code('http://localhost:4000/api')).toBe('blocked_address');
    expect(code('http://169.254.169.254/latest/meta-data')).toBe('blocked_address');
    expect(code('http://[::1]/')).toBe('blocked_address');
  });
  it('v testovacím režimu privátní adresy povolí', () => {
    expect(() => assertImportableUrl('http://127.0.0.1:9999/', true)).not.toThrow();
  });
});
