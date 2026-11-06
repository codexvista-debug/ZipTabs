import { NextRequest, NextResponse } from "next/server";

export const SESSION_COOKIE_NAME = "ziptabs_session";
export const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSessionSecret(): string {
  const secret =
    process.env.SESSION_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.SUPABASE_ACCESS_TOKEN ||
    "ziptabs_prod_session_secret_fallback_c8192a4";
  return secret;
}

export interface SessionUser {
  id: string;
  username: string;
  role: string;
  createdAt: number;
  expiresAt: number;
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
export async function createSessionToken(user: { id: string; username: string; role?: string }): Promise<string> {
  const now = Date.now();
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
    const key = await getHmacKey();
    const encoder = new TextEncoder();
    const signatureBytes = base64UrlDecode(sigB64);

    const isValid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes as any,
      encoder.encode(dataB64)
    );

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
 * Extracts and verifies session from an incoming NextRequest
 */
export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  const token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  return await verifySessionToken(token);
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
