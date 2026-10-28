/**
 * Secure cryptographic hashing and AES-256-GCM authenticated encryption
 * using the standard Web Crypto API.
 * Available natively in all modern browsers and Node.js runtimes.
 */

const SALT = "ziptabs_prod_salt_8f92b4c1_2026";
const VAULT_SALT = "ziptabs_vault_kdf_salt_9e31d8f_2026";

export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + ":" + SALT);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifyPassword(
  attempt: string,
  storedHashOrPlain: string
): Promise<boolean> {
  if (!storedHashOrPlain) return false;

  // 1. Check against SHA-256 hash
  const computedHash = await hashPassword(attempt);
  if (computedHash === storedHashOrPlain) {
    return true;
  }

  // 2. Backward compatibility fallback for legacy plaintext (e.g. before migration)
  if (attempt === storedHashOrPlain) {
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

/**
 * Derives a 256-bit AES-GCM CryptoKey using PBKDF2 (SHA-256, 100,000 iterations).
 */
export async function deriveVaultKey(secret: string, customSalt = VAULT_SALT): Promise<CryptoKey> {
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
