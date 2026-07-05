import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const IPV6_BITS = 128;

export async function assertPublicTarget(target: URL): Promise<void> {
  const hostname = target.hostname.replace(/^\[|\]$/g, "");
  const directIpVersion = isIP(hostname);
  const addresses = directIpVersion
    ? [{ address: hostname, family: directIpVersion }]
    : await lookup(hostname, { all: true, verbatim: true });

  if (addresses.length === 0) {
    throw new Error(`Unable to resolve target host: ${hostname}`);
  }

  for (const { address } of addresses) {
    if (isPrivateIp(address)) {
      throw new Error("Target resolves to a private or reserved IP address.");
    }
  }
}

function isPrivateIp(address: string): boolean {
  const version = isIP(address);

  if (version === 4) {
    return isPrivateIpv4(address);
  }

  if (version === 6) {
    const mappedIpv4 = address.toLowerCase().match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);

    if (mappedIpv4) {
      return isPrivateIpv4(mappedIpv4[1]);
    }

    return isPrivateIpv6(address);
  }

  return true;
}

function isPrivateIpv4(address: string): boolean {
  const octets = address.split(".").map(Number);
  const [first, second, third] = octets;

  return (
    first === 0 ||
    first === 10 ||
    first === 127 ||
    (first === 100 && second >= 64 && second <= 127) ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 0 && third === 0) ||
    (first === 192 && second === 0 && third === 2) ||
    (first === 192 && second === 168) ||
    (first === 198 && (second === 18 || second === 19)) ||
    (first === 198 && second === 51 && third === 100) ||
    (first === 203 && second === 0 && third === 113) ||
    first >= 224
  );
}

function isPrivateIpv6(address: string): boolean {
  const value = parseIpv6(address);

  if (value === null) {
    return true;
  }

  return (
    value === BigInt(0) ||
    value === BigInt(1) ||
    isIpv6InRange(value, "fc00::", 7) ||
    isIpv6InRange(value, "fe80::", 10) ||
    isIpv6InRange(value, "ff00::", 8) ||
    isIpv6InRange(value, "100::", 64) ||
    isIpv6InRange(value, "2001:db8::", 32)
  );
}

function isIpv6InRange(value: bigint, rangeStart: string, prefixLength: number): boolean {
  const start = parseIpv6(rangeStart);

  if (start === null) {
    return false;
  }

  const mask =
    ((BigInt(1) << BigInt(prefixLength)) - BigInt(1)) <<
    BigInt(IPV6_BITS - prefixLength);

  return (value & mask) === (start & mask);
}

function parseIpv6(address: string): bigint | null {
  const compressedParts = address.toLowerCase().split("::");

  if (compressedParts.length > 2) {
    return null;
  }

  const [head = "", tail = ""] = compressedParts;
  const headParts = head ? head.split(":") : [];
  const tailParts = tail ? tail.split(":") : [];
  const missingParts = compressedParts.length === 2 ? 8 - headParts.length - tailParts.length : 0;

  if (missingParts < 0) {
    return null;
  }

  const parts = [...headParts, ...Array(missingParts).fill("0"), ...tailParts];

  if (parts.length !== 8) {
    return null;
  }

  let value = BigInt(0);

  for (const part of parts) {
    const parsed = Number.parseInt(part, 16);

    if (!part || Number.isNaN(parsed) || parsed < 0 || parsed > 0xffff) {
      return null;
    }

    value = (value << BigInt(16)) + BigInt(parsed);
  }

  return value;
}
