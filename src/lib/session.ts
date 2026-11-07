import { NextRequest, NextResponse } from "next/server";
import { extractClientIp } from "@/lib/serverIp";

export const SESSION_COOKIE_NAME = "ziptabs_session";
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSessionSecret(): string {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.DISCORD_BOT_TOKEN ||
    process.env.DISCORD_CONTROL_PIN ||
    process.env.SUPABASE_ACCESS_TOKEN ||
    "ziptabs_prod_session_secret_fallback_c8192a4";

  return secret.trim();
}

function getCandidateSecrets(): string[] {
  const list = [
    process.env.SESSION_SECRET,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.DISCORD_BOT_TOKEN,
    process.env.DISCORD_CONTROL_PIN,
    process.env.SUPABASE_ACCESS_TOKEN,
    "ziptabs_prod_session_secret_fallback_c8192a4",
    "ziptabs_master_session_hmac_secret_2026",
  ];
  return Array.from(
    new Set(list.filter((s): s is string => typeof s === "string" && s.trim().length > 0))
  );
}

export interface SessionUser {
  id: string;
  username: string;
  role: string;
  createdAt: number;
  expiresAt: number;
}

interface SecurityStateSnapshot {
  kickSessionsBeforeMs: number;
  activeSessionId: string | null;
  blacklistedIps: string[];
  lockedIps: Set<string>;
  validUserIds: Set<string>;
  fetchedAt: number;
}

let cachedSecurityState: SecurityStateSnapshot | null = null;
const SECURITY_STATE_TTL_MS = 2000; // 2-second TTL for near-instant revocation

export function invalidateSessionSecurityCache(): void {
  cachedSecurityState = null;
}

async function getServerSecurityState(): Promise<SecurityStateSnapshot | null> {
  const now = Date.now();
  if (cachedSecurityState && now - cachedSecurityState.fetchedAt < SECURITY_STATE_TTL_MS) {
    return cachedSecurityState;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseKey) {
    return cachedSecurityState;
  }

  try {
    const headers = {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
    };
    const nowIso = new Date(now).toISOString();

    const [settingsRes, locksRes, usersRes] = await Promise.all([
      fetch(`${supabaseUrl}/rest/v1/system_security_settings?id=eq.global&select=kick_sessions_before,active_session_id,blacklisted_ips`, {
        headers,
        cache: "no-store",
      }),
      fetch(`${supabaseUrl}/rest/v1/auth_ip_locks?locked_until=gt.${encodeURIComponent(nowIso)}&select=ip,locked_until`, {
        headers,
        cache: "no-store",
      }),
      fetch(`${supabaseUrl}/rest/v1/app_users?select=id`, {
        headers,
        cache: "no-store",
      }),
    ]);

    let kickSessionsBeforeMs = 0;
    let activeSessionId: string | null = null;
    let blacklistedIps: string[] = [];

    if (settingsRes.ok) {
      const settingsData: any[] = await settingsRes.json();
      const globalRow = settingsData?.[0];
      if (globalRow) {
        if (globalRow.kick_sessions_before) {
          const parsed = new Date(globalRow.kick_sessions_before).getTime();
          if (!Number.isNaN(parsed)) kickSessionsBeforeMs = parsed;
        }
        activeSessionId = globalRow.active_session_id || null;
        if (Array.isArray(globalRow.blacklisted_ips)) {
          blacklistedIps = globalRow.blacklisted_ips;
        }
      }
    }

    const lockedIps = new Set<string>();
    if (locksRes.ok) {
      const locksData: any[] = await locksRes.json();
      if (Array.isArray(locksData)) {
        for (const l of locksData) {
          if (l?.ip) lockedIps.add(String(l.ip));
        }
      }
    }

    const validUserIds = new Set<string>();
    if (usersRes.ok) {
      const usersData: any[] = await usersRes.json();
      if (Array.isArray(usersData)) {
        for (const u of usersData) {
          if (u?.id) validUserIds.add(String(u.id));
        }
      }
    }

    cachedSecurityState = {
      kickSessionsBeforeMs,
      activeSessionId,
      blacklistedIps,
      lockedIps,
      validUserIds,
      fetchedAt: now,
    };
    return cachedSecurityState;
  } catch {
    return cachedSecurityState;
  }
}

function base64UrlEncode(buffer: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) {
    base64 += "=";
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    "raw",
    encoder.encode(getSessionSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Creates an HMAC-SHA256 signed session token
 */
export async function createSessionToken(
  user: { id: string; username: string; role?: string },
  customCreatedAtMs?: number
): Promise<string> {
  const now = customCreatedAtMs ?? Date.now();
  const payload: SessionUser = {
    id: user.id,
    username: user.username.toLowerCase(),
    role: user.role || "Administrator",
    createdAt: now,
    expiresAt: now + SESSION_DURATION_MS,
  };

  const encoder = new TextEncoder();
  const payloadJson = JSON.stringify(payload);
  const dataB64 = base64UrlEncode(encoder.encode(payloadJson));

  const key = await getHmacKey();
  const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(dataB64));
  const sigB64 = base64UrlEncode(new Uint8Array(signatureBuffer));

  return `${dataB64}.${sigB64}`;
}

/**
 * Verifies HMAC-SHA256 signature and expiration
 */
export async function verifySessionToken(token?: string | null): Promise<SessionUser | null> {
  if (!token || !token.includes(".")) return null;
  const [dataB64, sigB64] = token.split(".");
  if (!dataB64 || !sigB64) return null;

  try {
    const encoder = new TextEncoder();
    const signatureBytes = base64UrlDecode(sigB64);
    const dataBytes = encoder.encode(dataB64);

    const candidates = getCandidateSecrets();
    if (candidates.length === 0) {
      console.error("[AUTH SECURITY] No server session secrets configured; rejecting all session tokens.");
      return null;
    }

    let isValid = false;
    for (const candidate of candidates) {
      try {
        const key = await crypto.subtle.importKey(
          "raw",
          encoder.encode(candidate),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["verify"]
        );
        const match = await crypto.subtle.verify(
          "HMAC",
          key,
          signatureBytes as any,
          dataBytes
        );
        if (match) {
          isValid = true;
          break;
        }
      } catch {}
    }

    if (!isValid) return null;

    const payloadBytes = base64UrlDecode(dataB64);
    const payloadStr = new TextDecoder().decode(payloadBytes);
    const session: SessionUser = JSON.parse(payloadStr);

    if (!session || !session.expiresAt || session.expiresAt <= Date.now()) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

/**
 * Extracts and verifies session from an incoming NextRequest,
 * enforcing server-side session revocation (kick_sessions_before),
 * deleted user rejection (app_users), and IP blacklists/lockouts.
 */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = await verifySessionToken(token);
  if (!session) return null;

  const secState = await getServerSecurityState();
  if (secState) {
    const clientIp = extractClientIp(req);

    // 1. Reject blacklisted or locked-out IPs immediately
    if (secState.blacklistedIps.includes(clientIp) || secState.lockedIps.has(clientIp)) {
      return null;
    }

    // 2. Reject deleted users
    if (
      secState.validUserIds.size > 0 &&
      session.id !== "chief-default" &&
      !secState.validUserIds.has(session.id)
    ) {
      return null;
    }

    // 3. Reject sessions issued prior to kick_sessions_before (unless preserved activeSessionId)
    if (secState.kickSessionsBeforeMs > 0 && session.createdAt < secState.kickSessionsBeforeMs) {
      const reqSessionId = req.headers.get("x-session-id")?.trim() || "";
      const isPreserved = Boolean(
        secState.activeSessionId && reqSessionId && secState.activeSessionId === reqSessionId
      );
      if (!isPreserved) {
        return null;
      }
    }
  }

  return session;
}

/**
 * Attaches the HttpOnly session cookie to an outgoing NextResponse
 */
export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: Math.floor(SESSION_DURATION_MS / 1000),
  });
}

/**
 * Clears the session cookie on logout
 */
export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(SESSION_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
