/**
 * Cryptographic utility for Phone Directory.
 * Ensures zero plaintext storage in Supabase:
 * - All sensitive fields (Company, Name, Email, Phone) are encrypted with AES-256-GCM.
 * - Cryptographic SHA-256 hashes are stored for each field and for the full record.
 */

import {
  bufferToBase64,
  base64ToBuffer,
  deriveVaultKey,
  encryptVaultData,
  decryptVaultData,
} from "./crypto";

const DIRECTORY_MASTER_SECRET = "ziptabs_directory_vault_secure_pepper_2026_v1";
const DIRECTORY_SALT = "ziptabs_dir_kdf_salt_c814b7e_2026";

let cachedDirectoryKey: CryptoKey | null = null;

export async function getDirectoryKey(): Promise<CryptoKey> {
  if (cachedDirectoryKey) return cachedDirectoryKey;
  cachedDirectoryKey = await deriveVaultKey(DIRECTORY_MASTER_SECRET, DIRECTORY_SALT);
  return cachedDirectoryKey;
}

/**
 * Computes a SHA-256 hex digest of any string.
 */
export async function sha256Hex(text: string): Promise<string> {
  const normalized = (text || "").trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Encrypts arbitrary text into iv:ciphertext base64 string.
 */
export async function encryptField(plaintext: string, key: CryptoKey): Promise<string> {
  const { ciphertext, iv } = await encryptVaultData(plaintext || "", key);
  return `${iv}:${ciphertext}`;
}

/**
 * Decrypts iv:ciphertext string.
 */
export async function decryptField(payload: string, key: CryptoKey, fallbackIv = ""): Promise<string> {
  if (!payload) return "";
  try {
    if (payload.includes(":")) {
      const colonIdx = payload.indexOf(":");
      const iv = payload.substring(0, colonIdx);
      const ciphertext = payload.substring(colonIdx + 1);
      return await decryptVaultData(ciphertext, iv, key);
    }
    if (fallbackIv) {
      return await decryptVaultData(payload, fallbackIv, key);
    }
    return payload;
  } catch (err) {
    console.warn("Failed to decrypt field payload:", err);
    return "[Encrypted Data]";
  }
}

export interface DirectoryRecord {
  id: string;
  division: "employee" | "vendor";
  company: string;
  name: string;
  email: string;
  phone: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface RawSupabaseDirectoryRow {
  id: string;
  division: "employee" | "vendor";
  encrypted_company: string;
  encrypted_name: string;
  encrypted_email: string;
  encrypted_phone: string;
  company_hash: string;
  name_hash: string;
  email_hash: string;
  phone_hash: string;
  iv: string;
  notes?: string | null;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Prepares a directory record for Supabase insertion/updating:
 * Encrypts fields with AES-256-GCM and generates SHA-256 hashes.
 */
export async function encryptDirectoryRecordForDb(
  record: {
    id?: string;
    division: "employee" | "vendor";
    company: string;
    name: string;
    email: string;
    phone: string;
    notes?: string;
  },
  key: CryptoKey
): Promise<Omit<RawSupabaseDirectoryRow, "created_at" | "updated_at">> {
  // Generate a primary IV for this row
  const rowIv = bufferToBase64(crypto.getRandomValues(new Uint8Array(12)));

  const [
    encrypted_company,
    encrypted_name,
    encrypted_email,
    encrypted_phone,
    company_hash,
    name_hash,
    email_hash,
    phone_hash,
  ] = await Promise.all([
    encryptField(record.company.trim(), key),
    encryptField(record.name.trim(), key),
    encryptField(record.email.trim(), key),
    encryptField(record.phone.trim(), key),
    sha256Hex(record.company),
    sha256Hex(record.name),
    sha256Hex(record.email),
    sha256Hex(record.phone.replace(/\D/g, "") || record.phone),
  ]);

  return {
    ...(record.id ? { id: record.id } : {}),
    division: record.division,
    encrypted_company,
    encrypted_name,
    encrypted_email,
    encrypted_phone,
    company_hash,
    name_hash,
    email_hash,
    phone_hash,
    iv: rowIv,
    notes: record.notes?.trim() || null,
    metadata: {
      secured: true,
      crypto_algo: "AES-256-GCM + SHA-256",
      timestamp: new Date().toISOString(),
    },
  } as Omit<RawSupabaseDirectoryRow, "created_at" | "updated_at">;
}

/**
 * Decrypts a raw Supabase row into a plaintext DirectoryRecord in memory.
 */
export async function decryptSupabaseDirectoryRow(
  row: RawSupabaseDirectoryRow,
  key: CryptoKey
): Promise<DirectoryRecord> {
  const [company, name, email, phone] = await Promise.all([
    decryptField(row.encrypted_company, key, row.iv),
    decryptField(row.encrypted_name, key, row.iv),
    decryptField(row.encrypted_email, key, row.iv),
    decryptField(row.encrypted_phone, key, row.iv),
  ]);

  return {
    id: row.id,
    division: row.division,
    company: company.trim(),
    name: name.trim(),
    email: email.trim(),
    phone: phone.trim(),
    notes: row.notes || undefined,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
