import type { NextRequest } from "next/server";

/**
 * Robust Client IP Extraction Gateway
 * Defends against IP spoofing attacks by prioritizing tamper-proof edge headers
 * provided by the host platform (Vercel, Cloudflare) over untrusted X-Forwarded-For prefixes.
 */
export function extractClientIp(req: NextRequest): string {
  // 1. Vercel edge-verified remote IP (overwritten by Vercel edge; immune to client injection)
  const realIp = req.headers.get("x-real-ip");
  if (realIp && realIp.trim()) {
    return realIp.trim();
  }

  // 2. Vercel-specific forwarded header
  const vercelForwarded = req.headers.get("x-vercel-forwarded-for");
  if (vercelForwarded) {
    const parts = vercelForwarded.split(",").map((s) => s.trim()).filter(Boolean);
    if (parts.length > 0) return parts[0];
  }

  // 3. Cloudflare Connecting IP
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp && cfIp.trim()) {
    return cfIp.trim();
  }

  // 4. Standard X-Forwarded-For: read the last proxy hop added by closest proxy, not client ips[0]
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((s) => s.trim()).filter(Boolean);
    if (ips.length > 0) {
      return ips[ips.length - 1];
    }
  }

  // 5. Direct socket IP if exposed by server runtime
  const directIp = (req as any).ip;
  if (directIp && typeof directIp === "string") {
    return directIp.trim();
  }

  return "127.0.0.1";
}

/**
 * Returns two-letter uppercase country code from edge proxy headers.
 */
export function extractClientCountry(req: NextRequest): string | null {
  const vercelCountry = req.headers.get("x-vercel-ip-country");
  if (vercelCountry && vercelCountry.trim()) {
    return vercelCountry.trim().toUpperCase();
  }
  const cfCountry = req.headers.get("cf-ipcountry");
  if (cfCountry && cfCountry !== "XX" && cfCountry.trim()) {
    return cfCountry.trim().toUpperCase();
  }
  return null;
}

// Backward-compatibility alias
export const getClientIp = extractClientIp;
export const getClientCountry = extractClientCountry;
