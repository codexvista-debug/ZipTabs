/**
 * IP Geolocation and Country Flag Utilities
 */

const countryCache = new Map<string, string>();

export function isLocalOrPrivateIp(ip: string): boolean {
  if (!ip) return true;
  const clean = ip.trim().toLowerCase();
  if (
    clean === "127.0.0.1" ||
    clean === "::1" ||
    clean === "localhost" ||
    clean.startsWith("127.") ||
    clean.startsWith("192.168.") ||
    clean.startsWith("10.") ||
    clean.startsWith("169.254.") ||
    clean.startsWith("fe80:") ||
    clean.startsWith("fc00:") ||
    clean.startsWith("fd")
  ) {
    return true;
  }

  // RFC 1918 Private range: 172.16.0.0 - 172.31.255.255
  const match172 = clean.match(/^172\.(\d+)\./);
  if (match172) {
    const octet = parseInt(match172[1], 10);
    if (octet >= 16 && octet <= 31) {
      return true;
    }
  }

  return false;
}

/**
 * Returns a high-res flag image URL for universal cross-platform rendering (Windows, Mac, iOS, Android).
 */
export function getCountryFlagImgUrl(countryCode?: string | null): string | null {
  if (!countryCode || countryCode.length !== 2) return null;
  return `https://flagcdn.com/w40/${countryCode.toLowerCase()}.png`;
}

/**
 * Converts a 2-letter ISO country code (e.g. 'US', 'IN') into an emoji flag (🇺🇸, 🇮🇳).
 */
export function getCountryFlag(countryCode?: string | null, ip?: string): string {
  if (ip && isLocalOrPrivateIp(ip)) {
    return "💻";
  }
  if (!countryCode || countryCode.length !== 2) {
    return "🌐";
  }
  const cleanCode = countryCode.toUpperCase();
  const codePoints = cleanCode
    .split("")
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

/**
 * Returns human-readable country name from ISO code.
 */
export function getCountryName(countryCode?: string | null, ip?: string): string {
  if (ip && isLocalOrPrivateIp(ip)) {
    return "Local Network";
  }
  if (!countryCode || countryCode.length !== 2) {
    return "Global / Unknown";
  }
  try {
    const regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    return regionNames.of(countryCode.toUpperCase()) || countryCode.toUpperCase();
  } catch {
    return countryCode.toUpperCase();
  }
}

/**
 * Fetches country code for an IP address if not already cached.
 */
export async function fetchIpCountry(ip: string): Promise<string | null> {
  if (!ip || isLocalOrPrivateIp(ip)) return null;

  if (countryCache.has(ip)) {
    return countryCache.get(ip) || null;
  }

  try {
    const res = await fetch(`https://api.country.is/${ip}`, { signal: AbortSignal.timeout(2500) });
    if (res.ok) {
      const data = await res.json();
      if (data?.country && typeof data.country === "string") {
        const code = data.country.toUpperCase();
        countryCache.set(ip, code);
        return code;
      }
    }
  } catch {}

  countryCache.set(ip, "");
  return null;
}
