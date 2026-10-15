/**
 * Ochrana proti SSRF: rozpoznání privátních, loopback, link-local a rezervovaných adres.
 * Kontroluje se jak IP literál v URL, tak každá adresa vrácená DNS v okamžiku připojení
 * (vlastní `lookup` pro HTTP agenta), což brání i DNS rebinding útokům.
 */
import { BlockList, isIP } from 'node:net';

/** Rozsahy, kam importér nikdy nesmí posílat požadavky. */
const BLOCKED = new BlockList();
const IPV4_BLOCKED: [string, number][] = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];
const IPV6_BLOCKED: [string, number][] = [
  ['::', 128],
  ['::1', 128],
  ['fc00::', 7],
  ['fe80::', 10],
  ['ff00::', 8],
  ['2001:db8::', 32],
];
for (const [net, prefix] of IPV4_BLOCKED) BLOCKED.addSubnet(net, prefix, 'ipv4');
for (const [net, prefix] of IPV6_BLOCKED) BLOCKED.addSubnet(net, prefix, 'ipv6');

/**
 * Vrátí `true`, pokud IP adresa míří do privátní/rezervované sítě.
 * IPv4 adresy zabalené v IPv6 (`::ffff:10.0.0.1`, NAT64) se kontrolují jako IPv4.
 */
export function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) return BLOCKED.check(address, 'ipv4');
  if (family === 6) {
    const lower = address.toLowerCase();
    // Rozbalení IPv4-mapped / NAT64 adres, které by jinak obešly IPv4 pravidla.
    const embedded = /^(?:::ffff:|64:ff9b::)(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (embedded?.[1]) return BLOCKED.check(embedded[1], 'ipv4');
    return BLOCKED.check(lower, 'ipv6');
  }
  // Neznámý formát raději blokujeme.
  return true;
}
