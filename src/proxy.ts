import { NextRequest, NextResponse } from "next/server";

// In-memory security cache to avoid hammering Supabase while keeping <2s real-time responsiveness
let cachedSettings: {
  isVanishMode: boolean;
  allowedIps: string[];
  fetchedAt: number;
} | null = null;

const CACHE_TTL_MS = 2000; // 2 seconds TTL

function extractClientIp(req: NextRequest): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) {
    const ips = forwardedFor.split(",").map((s) => s.trim());
    if (ips[0]) return ips[0];
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  const cfIp = req.headers.get("cf-connecting-ip");
  if (cfIp) return cfIp.trim();
  return (req as any).ip || "127.0.0.1";
}

async function getSecuritySettings(): Promise<{ isVanishMode: boolean; allowedIps: string[] }> {
  const now = Date.now();
  if (cachedSettings && now - cachedSettings.fetchedAt < CACHE_TTL_MS) {
    return cachedSettings;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return { isVanishMode: false, allowedIps: [] };
  }

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/system_security_settings?id=in.(global,vanish_mode)&select=*`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
        cache: "no-store",
      }
    );

    if (res.ok) {
      const data: any[] = await res.json();
      const global = data.find((s) => s.id === "global");
      const vanish = data.find((s) => s.id === "vanish_mode");

      const isVanishMode = Boolean(vanish?.ip_lockdown_enabled);
      const allowedIps: string[] = Array.isArray(global?.allowed_ips) ? global.allowed_ips : [];

      cachedSettings = {
        isVanishMode,
        allowedIps,
        fetchedAt: now,
      };
      return cachedSettings;
    }
  } catch (err) {
    console.error("[Proxy] Failed to fetch security settings:", err);
  }

  return cachedSettings || { isVanishMode: false, allowedIps: [] };
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow Next.js internal static assets and public icons
  if (
    pathname.startsWith("/_next") ||
    pathname === "/icon.svg" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const clientIp = extractClientIp(request);
  const { isVanishMode, allowedIps } = await getSecuritySettings();

  if (isVanishMode) {
    const isWhitelisted = allowedIps.includes(clientIp);
    if (!isWhitelisted) {
      // Evict non-whitelisted IP immediately at the HTTP server level with HTTP 307.
      // Zero HTML, JS, or assets are sent to the client.
      return NextResponse.redirect("https://www.wikipedia.org", 307);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static files
     */
    "/((?!_next/static|_next/image|favicon.ico|icon.svg).*)",
  ],
};
