import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { supabase, supabaseAdmin } from "@/lib/supabase";
import { getClientIp } from "@/lib/serverIp";
import { invalidateSessionSecurityCache } from "@/lib/session";

const OPS_SALT = "ziptabs_ops_salt_8f3910c492_2026";

// Irreversible cryptographic SHA-256 salted hashes of authorization secrets
// Plaintext secrets (PIN, answers, slider values) NEVER exist in the codebase or client bundles.
const TARGET_HASHES = {
  PIN: "f89f106c5a97d4c66e209ebd7fe22b9e5c1c0d20c7c6e557e6155ebb85d1529b",
  EMBLEM: "fe1efc14511596aa920543867287d23041593588d7233225c71d4377b30c7c4e",
  MOVIE: "b075690d6866cd7b7346b6d1a0c0545ac06e8b17d89487cd9856d744cc821160",
  SLIDER: "a623fdd7d849db51c6d92cc1b2e4ea8630a42284d542f2c58bc2188323348975",
};

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
  Pragma: "no-cache",
};

function computeHash(val: string): string {
  return crypto.createHash("sha256").update(val + ":" + OPS_SALT).digest("hex");
}

function safeCompare(inputHash: string, targetHash: string): boolean {
  if (inputHash.length !== targetHash.length) return false;
  return crypto.timingSafeEqual(Buffer.from(inputHash, "hex"), Buffer.from(targetHash, "hex"));
}

function normalizeMovieAnswer(str: string): string {
  return (str || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function signStepToken(stage: number, clientIp: string): string {
  const secret = process.env.SESSION_SECRET || OPS_SALT;
  const payload = `${stage}:${clientIp}:${Date.now() + 5 * 60 * 1000}`; // 5 min expiry
  const sig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
  return `${Buffer.from(payload).toString("base64url")}.${sig}`;
}

function verifyStepToken(token: string, requiredStage: number, clientIp: string): boolean {
  try {
    const [b64Payload, sig] = token.split(".");
    if (!b64Payload || !sig) return false;
    const payload = Buffer.from(b64Payload, "base64url").toString("utf-8");
    const secret = process.env.SESSION_SECRET || OPS_SALT;
    const expectedSig = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(sig, "hex"), Buffer.from(expectedSig, "hex"))) {
      return false;
    }
    const [tokenStageStr, tokenIp, expStr] = payload.split(":");
    const tokenStage = parseInt(tokenStageStr, 10);
    const exp = parseInt(expStr, 10);
    if (tokenStage !== requiredStage) return false;
    if (tokenIp !== clientIp) return false;
    if (Date.now() > exp) return false;
    return true;
  } catch {
    return false;
  }
}

// In-memory failed attempts counter for IP lockout
const failedAttemptsMap = new Map<string, { attempts: number; lockedUntil: number }>();

function checkIpLock(clientIp: string): { locked: boolean; remainingAttempts: number } {
  const record = failedAttemptsMap.get(clientIp);
  if (!record) return { locked: false, remainingAttempts: 3 };
  if (Date.now() < record.lockedUntil) {
    return { locked: true, remainingAttempts: 0 };
  }
  return { locked: false, remainingAttempts: Math.max(0, 3 - record.attempts) };
}

function recordIpFailure(clientIp: string): { locked: boolean; remainingAttempts: number } {
  const now = Date.now();
  const current = failedAttemptsMap.get(clientIp) || { attempts: 0, lockedUntil: 0 };
  current.attempts += 1;
  if (current.attempts >= 3) {
    current.lockedUntil = now + 24 * 60 * 60 * 1000; // 24-hour lockout
  }
  failedAttemptsMap.set(clientIp, current);
  return {
    locked: current.attempts >= 3,
    remainingAttempts: Math.max(0, 3 - current.attempts),
  };
}

function clearIpLock(clientIp: string) {
  failedAttemptsMap.delete(clientIp);
}

export async function GET(req: NextRequest) {
  const clientIp = getClientIp(req);
  const db = supabaseAdmin || supabase;
  const lockStatus = checkIpLock(clientIp);

  let isLockdownActive = false;
  if (db) {
    try {
      const { data } = await db
        .from("system_security_settings")
        .select("ip_lockdown_enabled")
        .in("id", ["global", "vanish_mode"]);
      if (Array.isArray(data)) {
        isLockdownActive = data.some((r) => r.ip_lockdown_enabled);
      }
    } catch {}
  }

  return NextResponse.json(
    {
      success: true,
      clientIp,
      isLockdownActive,
      locked: lockStatus.locked,
      remainingAttempts: lockStatus.remainingAttempts,
    },
    { headers: NO_STORE_HEADERS }
  );
}

export async function POST(req: NextRequest) {
  const clientIp = getClientIp(req);
  const lockStatus = checkIpLock(clientIp);

  if (lockStatus.locked) {
    return NextResponse.json(
      {
        success: false,
        error: "Access Denied: Maximum security verification attempts exceeded. IP is locked for 24 hours.",
        locked: true,
      },
      { status: 403, headers: NO_STORE_HEADERS }
    );
  }

  let body: any = {};
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON payload." },
      { status: 400, headers: NO_STORE_HEADERS }
    );
  }

  const { action, token } = body;

  // STAGE 1: Verify 6-digit Master PIN
  if (action === "verify_pin") {
    const rawPin = String(body.pin || "").trim();
    if (!rawPin || rawPin.length !== 6 || !/^\d{6}$/.test(rawPin)) {
      const { locked, remainingAttempts } = recordIpFailure(clientIp);
      return NextResponse.json(
        {
          success: false,
          error: `Invalid 6-digit PIN format. ${remainingAttempts} attempt(s) remaining.`,
          locked,
        },
        { status: 400, headers: NO_STORE_HEADERS }
      );
    }

    const pinHash = computeHash(rawPin);
    if (!safeCompare(pinHash, TARGET_HASHES.PIN)) {
      const { locked, remainingAttempts } = recordIpFailure(clientIp);
      return NextResponse.json(
        {
          success: false,
          error: `Authorization failed. Incorrect PIN. ${remainingAttempts} attempt(s) remaining.`,
          locked,
        },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const nextToken = signStepToken(1, clientIp);
    return NextResponse.json(
      {
        success: true,
        stage: 1,
        message: "PIN accepted. Proceed to Challenge 1: Master Crest.",
        token: nextToken,
      },
      { headers: NO_STORE_HEADERS }
    );
  }

  // STAGE 2: Verify Master Crest Emblem
  if (action === "verify_emblem") {
    if (!token || !verifyStepToken(token, 1, clientIp)) {
      return NextResponse.json(
        { success: false, error: "Session expired or invalid sequence. Please restart from PIN." },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    const rawEmblem = String(body.emblem || "").trim().toLowerCase();
    const emblemHash = computeHash(rawEmblem);

    if (!safeCompare(emblemHash, TARGET_HASHES.EMBLEM)) {
      const { locked, remainingAttempts } = recordIpFailure(clientIp);
      return NextResponse.json(
        {
          success: false,
          error: `Incorrect system crest selected. ${remainingAttempts} attempt(s) remaining.`,
          locked,
        },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const nextToken = signStepToken(2, clientIp);
    return NextResponse.json(
      {
        success: true,
        stage: 2,
        message: "Crest verified. Proceed to Challenge 2: Security Clearance Question.",
        token: nextToken,
      },
      { headers: NO_STORE_HEADERS }
    );
  }

  // STAGE 3: Verify Security Question Answer (Movie)
  if (action === "verify_question") {
    if (!token || !verifyStepToken(token, 2, clientIp)) {
      return NextResponse.json(
        { success: false, error: "Session expired or invalid sequence. Please restart from PIN." },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    const rawAnswer = String(body.answer || "");
    const normalized = normalizeMovieAnswer(rawAnswer);
    const movieHash = computeHash(normalized);

    if (!safeCompare(movieHash, TARGET_HASHES.MOVIE)) {
      const { locked, remainingAttempts } = recordIpFailure(clientIp);
      return NextResponse.json(
        {
          success: false,
          error: `Incorrect security answer. ${remainingAttempts} attempt(s) remaining.`,
          locked,
        },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    const nextToken = signStepToken(3, clientIp);
    return NextResponse.json(
      {
        success: true,
        stage: 3,
        message: "Clearance verified. Proceed to Challenge 3: Frequency Calibration Dial.",
        token: nextToken,
      },
      { headers: NO_STORE_HEADERS }
    );
  }

  // STAGE 4: Verify Slider Dial & Execute Override
  if (action === "execute_override") {
    if (!token || !verifyStepToken(token, 3, clientIp)) {
      return NextResponse.json(
        { success: false, error: "Session expired or invalid sequence. Please restart from PIN." },
        { status: 403, headers: NO_STORE_HEADERS }
      );
    }

    const rawSlider = Math.round(Number(body.sliderValue));
    const sliderHash = computeHash(String(rawSlider));

    if (!safeCompare(sliderHash, TARGET_HASHES.SLIDER)) {
      const { locked, remainingAttempts } = recordIpFailure(clientIp);
      return NextResponse.json(
        {
          success: false,
          error: `Frequency calibration mismatch. ${remainingAttempts} attempt(s) remaining.`,
          locked,
        },
        { status: 401, headers: NO_STORE_HEADERS }
      );
    }

    // ALL 4 CHALLENGES PASSED! Execute Emergency Lockdown Deactivation
    const db = supabaseAdmin || supabase;
    if (!db) {
      return NextResponse.json(
        { success: false, error: "Database offline. Please retry in a few moments." },
        { status: 503, headers: NO_STORE_HEADERS }
      );
    }

    const nowIso = new Date().toISOString();

    try {
      // 1. Fetch current global settings to update allowed_ips
      const { data: globalData } = await db
        .from("system_security_settings")
        .select("allowed_ips")
        .eq("id", "global")
        .maybeSingle();

      const existingAllowed: string[] = Array.isArray(globalData?.allowed_ips)
        ? globalData.allowed_ips
        : [];
      const updatedAllowed = Array.from(new Set([...existingAllowed, clientIp]));

      // 2. Deactivate lockdown across both rows & whitelist client IP
      await Promise.all([
        db
          .from("system_security_settings")
          .update({
            ip_lockdown_enabled: false,
            allowed_ips: updatedAllowed,
            updated_at: nowIso,
            updated_by: `ops_override:${clientIp}`,
          })
          .eq("id", "global"),
        db
          .from("system_security_settings")
          .update({
            ip_lockdown_enabled: false,
            updated_at: nowIso,
            updated_by: `ops_override:${clientIp}`,
          })
          .eq("id", "vanish_mode"),
      ]);

      // 3. Clear any existing IP locks for this client
      try {
        await db.from("auth_ip_locks").delete().eq("ip", clientIp);
      } catch {}
      clearIpLock(clientIp);
      invalidateSessionSecurityCache();

      return NextResponse.json(
        {
          success: true,
          overrideExecuted: true,
          clientIp,
          message: "Lockdown mode deactivated. Standard perimeter restored.",
        },
        { headers: NO_STORE_HEADERS }
      );
    } catch (dbErr: any) {
      console.error("[OPS Override] Failed to update security settings:", dbErr);
      return NextResponse.json(
        { success: false, error: "Database update error: " + (dbErr?.message || "Unknown error") },
        { status: 500, headers: NO_STORE_HEADERS }
      );
    }
  }

  return NextResponse.json(
    { success: false, error: "Invalid action." },
    { status: 400, headers: NO_STORE_HEADERS }
  );
}
