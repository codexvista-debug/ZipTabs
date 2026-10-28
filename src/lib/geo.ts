/**
 * IP Geolocation and Country Flag Utilities
 */

const countryCache = new Map<string, string>();

export function isLocalOrPrivateIp(ip: string): boolean {
  if (!ip) return true;
  return (
    ip === "127.0.0.1" ||
    ip === "::1" ||
    ip === "localhost" ||
    ip.startsWith("192.168.") ||
    ip.startsWith("10.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("172.17.") ||
    ip.startsWith("172.18.") ||
    ip.startsWith("172.19.") ||
    ip.startsWith("172.2") ||
    ip.startsWith("172.30.") ||
    ip.startsWith("172.31.")
  );
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
