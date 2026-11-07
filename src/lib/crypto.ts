/**
 * Secure cryptographic hashing and AES-256-GCM authenticated encryption
 * using the standard Web Crypto API.
 * Available natively in all modern browsers and Node.js runtimes.
 */

const SALT = "ziptabs_prod_salt_8f92b4c1_2026";
const VAULT_SALT = "ziptabs_vault_kdf_salt_9e31d8f_2026";

export const VAULT_CRYPTO_SALT = "ziptabs_vault_kdf_salt_9e31d8f_2026";

export async function sha256SaltedHex(text: string, salt = VAULT_CRYPTO_SALT): Promise<string> {
  const normalized = (text || "").trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized + ":" + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Legacy static SHA-256 password hash (single iteration).
 * Maintained strictly for backward compatibility verification during login.
 */
export async function hashPasswordSha256Legacy(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + ":" + SALT);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Modern PBKDF2-HMAC-SHA256 password hashing with 100,000 iterations and unique 16-byte cryptographically random salt.
 * Output format: pbkdf2:<iterations>:<salt_hex>:<hash_hex>
 */
export async function hashPasswordPbkdf2(
  password: string,
  iterations = 100000,
  providedSaltHex?: string
): Promise<string> {
  const enc = new TextEncoder();
  let saltBytes: Uint8Array;
  if (providedSaltHex) {
    const matched = providedSaltHex.match(/.{1,2}/g) || [];
    saltBytes = new Uint8Array(matched.map((byte) => parseInt(byte, 16)));
  } else {
    saltBytes = new Uint8Array(16);
    crypto.getRandomValues(saltBytes);
  }

  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes as unknown as BufferSource,
      iterations,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  const derivedHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  const saltHex = Array.from(saltBytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `pbkdf2:${iterations}:${saltHex}:${derivedHex}`;
}

/**
 * Standard password hashing entrypoint: defaults to PBKDF2 (100,000 iterations).
 */
export async function hashPassword(password: string): Promise<string> {
  return await hashPasswordPbkdf2(password);
}

/**
 * Checks whether a stored password string is in a legacy format (plaintext or single-iteration SHA-256)
 * that should be automatically upgraded to PBKDF2 on next login.
 */
export function isLegacyPasswordHash(storedHashOrPlain?: string | null): boolean {
  if (!storedHashOrPlain) return false;
  return !storedHashOrPlain.startsWith("pbkdf2:");
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Verifies a password attempt against stored PBKDF2 hash, legacy SHA-256 hash, or legacy plaintext.
 */
export async function verifyPassword(
  attempt: string,
  storedHashOrPlain: string
): Promise<boolean> {
  if (!storedHashOrPlain) return false;

  // 1. PBKDF2 hash verification
  if (storedHashOrPlain.startsWith("pbkdf2:")) {
    const parts = storedHashOrPlain.split(":");
    if (parts.length === 4) {
      const iterations = parseInt(parts[1], 10);
      const saltHex = parts[2];
      const expectedHashHex = parts[3];

      if (!isNaN(iterations) && saltHex && expectedHashHex) {
        const recomputed = await hashPasswordPbkdf2(attempt, iterations, saltHex);
        const recomputedParts = recomputed.split(":");
        const recomputedHashHex = recomputedParts[3];
        return timingSafeEqual(expectedHashHex, recomputedHashHex);
      }
    }
  }

  // 2. Legacy SHA-256 check
  const legacyHash = await hashPasswordSha256Legacy(attempt);
  if (timingSafeEqual(legacyHash, storedHashOrPlain)) {
    return true;
  }

  // 3. Backward compatibility fallback for legacy plaintext (e.g. initial setup)
  if (timingSafeEqual(attempt, storedHashOrPlain)) {
    return true;
  }

  return false;
}

// Convert Uint8Array or ArrayBuffer to base64
export function bufferToBase64(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

// Convert base64 string to Uint8Array
export function base64ToBuffer(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

const derivedKeyCache = new Map<string, Promise<CryptoKey>>();

export function clearDerivedKeyCache(): void {
  derivedKeyCache.clear();
}

/**
 * Derives a 256-bit AES-GCM CryptoKey using PBKDF2 (SHA-256, 100,000 iterations).
 * Memoized in memory per session so identical key derivations do not block the UI thread repeatedly.
 */
export async function deriveVaultKey(secret: string, customSalt = VAULT_SALT): Promise<CryptoKey> {
  const cacheKey = `${customSalt}:${secret}`;
  const existing = derivedKeyCache.get(cacheKey);
  if (existing) return existing;

  const promise = (async () => {
    const enc = new TextEncoder();
    const baseKey = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret) as unknown as BufferSource,
      "PBKDF2",
      false,
      ["deriveKey"]
    );

    return await crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: enc.encode(customSalt) as unknown as BufferSource,
        iterations: 100000,
        hash: "SHA-256",
      },
      baseKey,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"]
    );
  })();

  derivedKeyCache.set(cacheKey, promise);
  return promise;
}

/**
 * Encrypts arbitrary plaintext using AES-256-GCM.
 * Returns base64 ciphertext and base64 IV.
 */
export async function encryptVaultData(
  plaintext: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const enc = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    enc.encode(plaintext) as unknown as BufferSource
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv),
  };
}

/**
 * Decrypts AES-256-GCM ciphertext using the derived CryptoKey and IV.
 * Throws an error if key is invalid or ciphertext was altered (tamper-detection).
 */
export async function decryptVaultData(
  ciphertextBase64: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  const dec = new TextDecoder();
  const iv = base64ToBuffer(ivBase64);
  const ciphertext = base64ToBuffer(ciphertextBase64);

  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    key,
    ciphertext as unknown as BufferSource
  );

  return dec.decode(decryptedBuffer);
}

/**
 * Encrypts arbitrary plaintext and packages the IV directly with the ciphertext (iv:ciphertext).
 * Guarantees that individual encrypted fields (e.g. notes, metadata) never suffer from IV mismatch.
 */
export async function encryptVaultPayload(
  plaintext: string,
  key: CryptoKey
): Promise<string> {
  const { ciphertext, iv } = await encryptVaultData(plaintext, key);
  return `${iv}:${ciphertext}`;
}

/**
 * Decrypts a vault payload, automatically unpacking the embedded IV if present (iv:ciphertext),
 * or falling back to the row-level IV for legacy compatibility.
 */
export async function decryptVaultPayload(
  payload: string,
  fallbackIv: string,
  key: CryptoKey
): Promise<string> {
  if (payload.includes(":")) {
    const colonIdx = payload.indexOf(":");
    const iv = payload.substring(0, colonIdx);
    const ciphertext = payload.substring(colonIdx + 1);
    return await decryptVaultData(ciphertext, iv, key);
  }
  return await decryptVaultData(payload, fallbackIv, key);
}
