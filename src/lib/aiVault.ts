import { supabase, supabaseAdmin } from "@/lib/supabase";
import crypto from "crypto";

const VAULT_SALT = "ziptabs_server_ai_vault_salt_2026";

function getServerSecrets(): string[] {
  const list = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SESSION_SECRET,
  ];
  return list.filter((s): s is string => Boolean(s && s.trim().length > 0));
}

function encryptPayload(data: { groq?: string; gemini?: string }, secret: string): string {
  const iv = crypto.randomBytes(12);
  const key = crypto.pbkdf2Sync(secret, VAULT_SALT, 100000, 32, "sha256");
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const payloadStr = JSON.stringify(data);
  const encrypted = Buffer.concat([cipher.update(payloadStr, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return (
    iv.toString("base64") +
    ":" +
    encrypted.toString("base64") +
    ":" +
    tag.toString("base64")
  );
}

function decryptPayload(
  packaged: string,
  secret: string
): { groq?: string; gemini?: string } | null {
  try {
    const parts = packaged.split(":");
    if (parts.length !== 3) return null;
    const iv = Buffer.from(parts[0], "base64");
    const data = Buffer.from(parts[1], "base64");
    const tag = Buffer.from(parts[2], "base64");
    const key = crypto.pbkdf2Sync(secret, VAULT_SALT, 100000, 32, "sha256");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
    return JSON.parse(decrypted);
  } catch {
    return null;
  }
}

let cachedKeys: { groq?: string; gemini?: string; expiresAt: number } | null = null;

/**
 * Retrieves the specified AI API key.
 * 1. Checks environment variables (GROQ_API_KEY / GEMINI_API_KEY)
 * 2. Checks in-memory server cache
 * 3. Fallback: Loads AES-256-GCM encrypted keys from Supabase system_security_settings ('ai_vault')
 */
export async function getAiApiKey(provider: "groq" | "gemini"): Promise<string | null> {
  // 1. Process environment variable (e.g. set in Vercel or .env.local)
  const envVal =
    provider === "groq" ? process.env.GROQ_API_KEY : process.env.GEMINI_API_KEY;
  if (envVal && envVal.trim().length > 0) {
    return envVal.trim();
  }

  // 2. In-memory cache
  if (cachedKeys && Date.now() < cachedKeys.expiresAt) {
    if (provider === "groq" && cachedKeys.groq) return cachedKeys.groq;
    if (provider === "gemini" && cachedKeys.gemini) return cachedKeys.gemini;
  }

  // 3. Fallback: Retrieve from Supabase ai_vault row
  const db = supabaseAdmin || supabase;
  if (!db) return null;

  try {
    const { data } = await db
      .from("system_security_settings")
      .select("active_session_id")
      .eq("id", "ai_vault")
      .maybeSingle();

    if (data?.active_session_id) {
      const secrets = getServerSecrets();
      for (const secret of secrets) {
        const decrypted = decryptPayload(data.active_session_id, secret);
        if (decrypted && (decrypted.groq || decrypted.gemini)) {
          cachedKeys = {
            groq: decrypted.groq,
            gemini: decrypted.gemini,
            expiresAt: Date.now() + 5 * 60 * 1000, // 5 min cache
          };
          return provider === "groq"
            ? decrypted.groq || null
            : decrypted.gemini || null;
        }
      }
    }
  } catch (err) {
    console.error("Failed to load AI keys from database vault:", err);
  }

  return null;
}

/**
 * Saves or updates encrypted AI keys in Supabase system_security_settings ('ai_vault').
 */
export async function saveAiApiKeys(keys: { groq?: string; gemini?: string }): Promise<boolean> {
  const db = supabaseAdmin || supabase;
  if (!db) return false;

  const secrets = getServerSecrets();
  const primarySecret = secrets[0];
  if (!primarySecret) return false;

  try {
    // Merge with current keys if updating only one
    const currentGroq = await getAiApiKey("groq");
    const currentGemini = await getAiApiKey("gemini");

    const payload = {
      groq: keys.groq !== undefined ? keys.groq : currentGroq || "",
      gemini: keys.gemini !== undefined ? keys.gemini : currentGemini || "",
    };

    const encryptedString = encryptPayload(payload, primarySecret);

    const { error } = await db.from("system_security_settings").upsert({
      id: "ai_vault",
      active_session_id: encryptedString,
      updated_by: "chief:ai_vault",
      updated_at: new Date().toISOString(),
    });

    if (!error) {
      cachedKeys = {
        groq: payload.groq,
        gemini: payload.gemini,
        expiresAt: Date.now() + 5 * 60 * 1000,
      };
      return true;
    }
  } catch (err) {
    console.error("Failed to save AI keys to database vault:", err);
  }

  return false;
}
