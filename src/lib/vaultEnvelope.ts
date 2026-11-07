import crypto from "crypto";

const SERVER_VAULT_ENVELOPE_SALT = "ziptabs_server_vault_envelope_salt_v1_2026";
const SERVER_ENVELOPE_PREFIX = "srv1:";

// Cache derived 32-byte PBKDF2 keys in server memory per secret to avoid redundant CPU work
const derivedKeyCache = new Map<string, Buffer>();

function getServerSecrets(): string[] {
  const candidates = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.SESSION_SECRET,
  ];
  return Array.from(
    new Set(
      candidates
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim())
    )
  );
}

function getDerivedEnvelopeKey(secret: string): Buffer {
  const cached = derivedKeyCache.get(secret);
  if (cached) return cached;

  const key = crypto.pbkdf2Sync(
    secret,
    SERVER_VAULT_ENVELOPE_SALT,
    100000,
    32,
    "sha256"
  );
  derivedKeyCache.set(secret, key);
  return key;
}

/**
 * Derives a deterministic 256-bit server-only HMAC pepper for @chief's client-side Vault KDF.
 * Never exposed in client bundles; delivered exclusively via authenticated /api/vault.
 */
export function deriveChiefVaultPepper(userId: string): string {
  const secrets = getServerSecrets();
  const primary = secrets[0];
  if (!primary) {
    throw new Error("Server vault secret is not configured.");
  }
  return crypto
    .createHmac("sha256", primary)
    .update(`ziptabs_chief_vault_kdf_pepper_v2:${userId || "chief"}`)
    .digest("hex");
}

/**
 * Wraps a client-encrypted AES-256-GCM payload with a second layer of
 * server-only AES-256-GCM envelope encryption ("srv1:<iv>:<tag>:<ciphertext>").
 * Ensures that even if the database AND client JS bundle were compromised,
 * vault_credentials rows cannot be decrypted offline without the server secret.
 */
export function wrapVaultField(clientCiphertext: string): string {
  if (!clientCiphertext) return "";

  // If already wrapped, unwrap first so we never double-wrap
  const cleanInput = clientCiphertext.startsWith(SERVER_ENVELOPE_PREFIX)
    ? unwrapVaultField(clientCiphertext).value
    : clientCiphertext;

  const secrets = getServerSecrets();
  const primarySecret = secrets[0];
  if (!primarySecret) {
    throw new Error("Server vault envelope secret is missing.");
  }

  const key = getDerivedEnvelopeKey(primarySecret);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(cleanInput, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  return `${SERVER_ENVELOPE_PREFIX}${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

/**
 * Unwraps a server-enveloped vault field ("srv1:<iv>:<tag>:<ciphertext>").
 * Seamlessly supports legacy non-wrapped values (wasWrapped: false) so existing
 * database records can be read and transparently upgraded in-place with zero data loss.
 */
export function unwrapVaultField(storedValue?: string | null): {
  value: string;
  wasWrapped: boolean;
} {
  if (!storedValue) {
    return { value: "", wasWrapped: false };
  }

  if (!storedValue.startsWith(SERVER_ENVELOPE_PREFIX)) {
    return { value: storedValue, wasWrapped: false };
  }

  const body = storedValue.slice(SERVER_ENVELOPE_PREFIX.length);
  const parts = body.split(":");
  if (parts.length !== 3) {
    throw new Error("Malformed server vault envelope payload.");
  }

  const [ivB64, tagB64, dataB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const encrypted = Buffer.from(dataB64, "base64");

  const secrets = getServerSecrets();
  for (const secret of secrets) {
    try {
      const key = getDerivedEnvelopeKey(secret);
      const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
      decipher.setAuthTag(tag);
      const decrypted = Buffer.concat([
        decipher.update(encrypted),
        decipher.final(),
      ]).toString("utf8");
      return { value: decrypted, wasWrapped: true };
    } catch {
      // Try next candidate secret if rotated
    }
  }

  throw new Error("Failed to unwrap server vault envelope: authentication tag mismatch.");
}
