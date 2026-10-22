/**
 * Secure cryptographic hashing using the standard Web Crypto API (SHA-256)
 * Available natively in all modern browsers and Node.js runtimes.
 */

const SALT = "ziptabs_prod_salt_8f92b4c1_2026";

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
