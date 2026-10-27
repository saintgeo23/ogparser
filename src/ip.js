import net from 'node:net';

const blockList = new net.BlockList();

const IPV4_RANGES = [
  ['0.0.0.0', 8], // "this" network
  ['10.0.0.0', 8], // private
  ['100.64.0.0', 10], // carrier-grade NAT
  ['127.0.0.0', 8], // loopback
  ['169.254.0.0', 16], // link-local, cloud metadata
  ['172.16.0.0', 12], // private
  ['192.0.0.0', 24], // IETF protocol assignments
  ['192.0.2.0', 24], // documentation
  ['192.168.0.0', 16], // private
  ['198.18.0.0', 15], // benchmarking
  ['198.51.100.0', 24], // documentation
  ['203.0.113.0', 24], // documentation
  ['224.0.0.0', 4], // multicast
  ['240.0.0.0', 4], // reserved, broadcast
];

const IPV6_RANGES = [
  ['::', 128], // unspecified
  ['::1', 128], // loopback
  ['64:ff9b::', 96], // NAT64
  ['2001:db8::', 32], // documentation
  ['fc00::', 7], // unique local
  ['fe80::', 10], // link-local
  ['ff00::', 8], // multicast
];

for (const [address, prefix] of IPV4_RANGES) blockList.addSubnet(address, prefix, 'ipv4');
for (const [address, prefix] of IPV6_RANGES) blockList.addSubnet(address, prefix, 'ipv6');

/**
 * Extracts IPv4 from IPv4-mapped IPv6 address: ::ffff:127.0.0.1 or ::ffff:7f00:1
 * @param {string} address
 * @returns {string | null}
 */
function unmapIPv4(address) {
  const match = /^::ffff:(.+)$/i.exec(address);

  if (!match) return null;
  if (net.isIPv4(match[1])) return match[1];

  const groups = match[1].split(':');

  if (groups.length !== 2) return null;

  const [high, low] = groups.map((group) => parseInt(group, 16));

  return [high >> 8, high & 255, low >> 8, low & 255].join('.');
}

/**
 * @param {string} address
 * @returns {boolean} true if address is loopback, private, link-local or otherwise not public
 */
export function isPrivateAddress(address) {
  const ip = address.replace(/^\[|\]$/g, '');

  if (net.isIPv4(ip)) return blockList.check(ip, 'ipv4');
  if (!net.isIPv6(ip)) return false;

  const mapped = unmapIPv4(ip);

  return mapped ? blockList.check(mapped, 'ipv4') : blockList.check(ip, 'ipv6');
}
