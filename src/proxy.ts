import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { extractClientIp } from "@/lib/serverIp";

// In-memory security cache to avoid hammering Supabase while keeping <2s real-time responsiveness
let cachedSettings: {
  isVanishMode: boolean;
  allowedIps: string[];
  blacklistedIps: string[];
  lockedIps: Set<string>;
  fetchedAt: number;
} | null = null;

const CACHE_TTL_MS = 2000; // 2 seconds TTL

async function getSecuritySettings(): Promise<{
  isVanishMode: boolean;
  allowedIps: string[];
  blacklistedIps: string[];
  lockedIps: Set<string>;
}> {
  const now = Date.now();
  if (cachedSettings && now - cachedSettings.fetchedAt < CACHE_TTL_MS) {
    return cachedSettings;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return {
      isVanishMode: false,
      allowedIps: [],
      blacklistedIps: [],
      lockedIps: new Set(),
    };
  }

  try {
    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    };
    const nowIso = new Date(now).toISOString();

    const [settingsRes, locksRes] = await Promise.all([
      fetch(
        `${supabaseUrl}/rest/v1/system_security_settings?id=in.(global,vanish_mode)&select=*`,
        {
          headers,
          cache: "no-store",
        }
      ),
      fetch(
        `${supabaseUrl}/rest/v1/auth_ip_locks?locked_until=gt.${encodeURIComponent(nowIso)}&select=ip,locked_until`,
        {
          headers,
          cache: "no-store",
        }
      ),
    ]);

    if (settingsRes.ok) {
      const data: any[] = await settingsRes.json();
      const global = data.find((s) => s.id === "global");
      const vanish = data.find((s) => s.id === "vanish_mode");

      // Unified Lockdown: if either global or vanish_mode indicates lockdown, lock & cloak site
      const isLockdown = Boolean(global?.ip_lockdown_enabled || vanish?.ip_lockdown_enabled);
      const allowedIps: string[] = Array.isArray(global?.allowed_ips) ? global.allowed_ips : [];
      const blacklistedIps: string[] = Array.isArray(global?.blacklisted_ips)
        ? global.blacklisted_ips
        : [];

      const lockedIps = new Set<string>();
      if (locksRes.ok) {
        const locksData: any[] = await locksRes.json();
        if (Array.isArray(locksData)) {
          for (const l of locksData) {
            if (l?.ip) lockedIps.add(String(l.ip));
          }
        }
      }

      cachedSettings = {
        isVanishMode: isLockdown,
        allowedIps,
        blacklistedIps,
        lockedIps,
        fetchedAt: now,
      };
      return cachedSettings;
    }
  } catch (err) {
    console.error("[Proxy] Failed to fetch security settings:", err);
  }

  return (
    cachedSettings || {
      isVanishMode: false,
      allowedIps: [],
      blacklistedIps: [],
      lockedIps: new Set(),
    }
  );
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow Next.js internal static assets, public icons, and secure Discord slash commands
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/discord") ||
    pathname === "/icon.svg" ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  const clientIp = extractClientIp(request);
  const { isVanishMode, allowedIps, blacklistedIps, lockedIps } =
    await getSecuritySettings();

  if (isVanishMode) {
    const isWhitelisted = allowedIps.includes(clientIp);
    if (!isWhitelisted) {
      // Evict non-whitelisted IP immediately at the HTTP server level with HTTP 307.
      // Zero HTML, JS, or assets are sent to the client.
      return NextResponse.redirect("https://www.wikipedia.org", 307);
    }
  }

  // Session & IP gate for internal API routes
  if (pathname.startsWith("/api/")) {
    const isStatusOrLogoutApi =
      pathname.startsWith("/api/auth/lockout-status") ||
      pathname.startsWith("/api/auth/me") ||
      pathname.startsWith("/api/auth/logout") ||
      pathname.startsWith("/api/discord");

    // Block blacklisted or locked-out IPs from hitting any action/data API (including login/register/vault)
    if (!isStatusOrLogoutApi) {
      if (blacklistedIps.includes(clientIp) || lockedIps.has(clientIp)) {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden: Your IP address is currently locked or blacklisted.",
          },
          { status: 403 }
        );
      }
    }

    const isPublicApi =
      isStatusOrLogoutApi ||
      pathname.startsWith("/api/auth/login") ||
      pathname.startsWith("/api/auth/register");

    if (!isPublicApi) {
      const session = await getSessionUser(request);
      if (!session) {
        return NextResponse.json(
          { success: false, error: "Unauthorized: Active session required." },
          { status: 401 }
        );
      }
      if (
        (pathname.startsWith("/api/master-control") ||
          pathname.startsWith("/api/vault")) &&
        session.username?.toLowerCase() !== "chief" &&
        session.role !== "Chief Administrator"
      ) {
        return NextResponse.json(
          {
            success: false,
            error: "Forbidden: This endpoint strictly requires @chief authorization.",
          },
          { status: 403 }
        );
      }
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
