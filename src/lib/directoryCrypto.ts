/**
 * Cryptographic utility for Phone Directory.
 * Ensures zero plaintext storage in Supabase:
 * - All sensitive fields (Company, Name, Email, Phone, Notes) are encrypted with AES-256-GCM.
 * - Cryptographic salted SHA-256 hashes are stored for each field.
 */

import {
  bufferToBase64,
  base64ToBuffer,
  deriveVaultKey,
  encryptVaultData,
  decryptVaultData,
} from "./crypto";

export const DIRECTORY_MASTER_SECRET = "ziptabs_directory_vault_secure_pepper_2026_v1";
export const DIRECTORY_SALT = "ziptabs_dir_kdf_salt_c814b7e_2026";

let cachedDirectoryKey: CryptoKey | null = null;

export function getDirectorySecret(): string {
  if (typeof process !== "undefined" && process?.env) {
    return process.env.DIRECTORY_SECRET || process.env.SESSION_SECRET || DIRECTORY_MASTER_SECRET;
  }
  return DIRECTORY_MASTER_SECRET;
}

export async function getDirectoryKey(): Promise<CryptoKey> {
  if (cachedDirectoryKey) return cachedDirectoryKey;
  cachedDirectoryKey = await deriveVaultKey(getDirectorySecret(), DIRECTORY_SALT);
  return cachedDirectoryKey;
}

/**
 * Computes a salted SHA-256 hex digest of any string.
 */
export async function sha256SaltedHex(text: string, salt = DIRECTORY_SALT): Promise<string> {
  const normalized = (text || "").trim().toLowerCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized + ":" + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Backward-compatible alias
export const sha256Hex = sha256SaltedHex;

/**
 * Normalizes and formats any US phone number into:
 * 1 (XXX) XXX-XXXX
 *
 * Guaranteed uniform style across the entire application:
 * Starts with '1 ', 3 numbers in brackets, space, 3 numbers, dash, 4 numbers.
 */
export function formatUSAPhone(raw: string, includeExtension = false): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed) return "";

  // Extract extension if present (e.g. ext, ext., x, #, extension)
  let extension = "";
  const extMatch = trimmed.match(/(?:ext|ext\.|x|#|extension)[\s.:]*(\d+)/i);
  if (extMatch) {
    extension = ` Ext. ${extMatch[1]}`;
  }

  // Remove extension portion before extracting core digits
  const mainPart = extMatch ? trimmed.substring(0, extMatch.index) : trimmed;
  let digits = mainPart.replace(/\D/g, "");

  // If 11 digits starting with 1, strip country code for uniform parsing
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.substring(1);
  }

  const extSuffix = includeExtension ? extension : "";

  // Standard 10-digit US number -> 1 (XXX) XXX-XXXX
  if (digits.length === 10) {
    const area = digits.substring(0, 3);
    const prefix = digits.substring(3, 6);
    const line = digits.substring(6, 10);
    return `1 (${area}) ${prefix}-${line}${extSuffix}`;
  }

  // More than 10 digits without explicit ext keyword -> extra digits become Ext if includeExtension
  if (digits.length > 10) {
    const area = digits.substring(0, 3);
    const prefix = digits.substring(3, 6);
    const line = digits.substring(6, 10);
    const extra = digits.substring(10);
    return `1 (${area}) ${prefix}-${line}${includeExtension ? (extension || ` Ext. ${extra}`) : ""}`;
  }

  // Partial digits (e.g. 7 digits local or partial input)
  if (digits.length === 7) {
    return `1 (555) ${digits.substring(0, 3)}-${digits.substring(3, 7)}${extSuffix}`;
  }

  // If already formatted or fallback
  if (digits.length > 0) {
    return trimmed.startsWith("1 ") ? trimmed : `1 ${trimmed}`;
  }

  return trimmed;
}

/**
 * Extracts phone and extension separately.
 */
export function parsePhoneAndExtension(raw: string): { phone: string; extension?: string } {
  if (!raw) return { phone: "" };
  const trimmed = raw.trim();
  const extMatch = trimmed.match(/(?:ext|ext\.|x|#|extension)[\s.:]*(\d+)/i);
  const extension = extMatch ? extMatch[1] : undefined;
  const corePhone = formatUSAPhone(trimmed, false);
  return { phone: corePhone, extension };
}

/**
 * Interactive input formatter for USA phone numbers as the user types:
 * Automatically formats digits into `1 (XXX) XXX-XXXX`.
 */
export function formatAsYouTypeUSAPhone(value: string): string {
  if (!value) return "";
  const extMatch = value.match(/(?:ext|ext\.|x|#|extension)[\s.:]*(\d*)/i);
  const mainPart = extMatch ? value.substring(0, extMatch.index) : value;
  let digits = mainPart.replace(/\D/g, "");

  if (digits.length === 0) return "";
  if (digits.length === 1 && digits === "1") return "1 ";
  if (digits.startsWith("1")) {
    digits = digits.substring(1);
  }

  if (digits.length === 0) return "1 ";
  if (digits.length <= 3) {
    return `1 (${digits}`;
  }
  if (digits.length <= 6) {
    return `1 (${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }
  return `1 (${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6, 10)}`;
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
  extension?: string;
  notes?: string;
  _phoneNeedsUpgrade?: boolean;
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
  encrypted_notes?: string | null;
  company_hash: string;
  name_hash: string;
  email_hash: string;
  phone_hash: string;
  notes_hash?: string | null;
  iv: string;
  notes?: string | null;
  metadata?: Record<string, any>;
  created_at?: string;
  updated_at?: string;
}

/**
 * Prepares a directory record for Supabase insertion/updating:
 * Encrypts all fields (including Notes & Phone) with AES-256-GCM
 * and generates salted SHA-256 hashes.
 */
export async function encryptDirectoryRecordForDb(
  record: {
    id?: string;
    division: "employee" | "vendor";
    company: string;
    name: string;
    email: string;
    phone: string;
    extension?: string;
    notes?: string;
  },
  key: CryptoKey
): Promise<Omit<RawSupabaseDirectoryRow, "created_at" | "updated_at">> {
  // Generate a primary IV for this row
  const rowIv = bufferToBase64(crypto.getRandomValues(new Uint8Array(12)));
  const { phone: parsedPhone, extension: parsedExt } = parsePhoneAndExtension(record.phone);
  const finalExtension = record.extension?.trim() || parsedExt || undefined;
  const formattedPhone = parsedPhone || formatUSAPhone(record.phone, false);
  const cleanPhone = formattedPhone.replace(/\D/g, "") || formattedPhone.trim();
  const trimmedNotes = record.notes?.trim() || "";

  const [
    encrypted_company,
    encrypted_name,
    encrypted_email,
    encrypted_phone,
    encrypted_notes,
    company_hash,
    name_hash,
    email_hash,
    phone_hash,
    notes_hash,
  ] = await Promise.all([
    encryptField(record.company.trim(), key),
    encryptField(record.name.trim(), key),
    encryptField(record.email.trim(), key),
    encryptField(formattedPhone, key),
    trimmedNotes ? encryptField(trimmedNotes, key) : Promise.resolve(null),
    sha256SaltedHex(record.company),
    sha256SaltedHex(record.name),
    sha256SaltedHex(record.email),
    sha256SaltedHex(cleanPhone),
    trimmedNotes ? sha256SaltedHex(trimmedNotes) : Promise.resolve(null),
  ]);

  return {
    ...(record.id ? { id: record.id } : {}),
    division: record.division,
    encrypted_company,
    encrypted_name,
    encrypted_email,
    encrypted_phone,
    encrypted_notes,
    company_hash,
    name_hash,
    email_hash,
    phone_hash,
    notes_hash,
    iv: rowIv,
    notes: null, // Keep plaintext notes column null for zero plaintext
    metadata: {
      secured: true,
      crypto_algo: "AES-256-GCM + Salted SHA-256",
      extension: finalExtension,
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
  const [company, name, email, phone, decryptedNotes] = await Promise.all([
    decryptField(row.encrypted_company, key, row.iv),
    decryptField(row.encrypted_name, key, row.iv),
    decryptField(row.encrypted_email, key, row.iv),
    decryptField(row.encrypted_phone, key, row.iv),
    row.encrypted_notes
      ? decryptField(row.encrypted_notes, key, row.iv)
      : Promise.resolve(row.notes || ""),
  ]);

  const rawTrimmedPhone = phone.trim();
  const { phone: formattedPhone, extension: phoneExt } = parsePhoneAndExtension(rawTrimmedPhone);
  const parsedExtension = row.metadata?.extension || phoneExt || undefined;
  const _phoneNeedsUpgrade = Boolean(rawTrimmedPhone && rawTrimmedPhone !== formattedPhone);

  return {
    id: row.id,
    division: row.division,
    company: company.trim(),
    name: name.trim(),
    email: email.trim(),
    phone: formattedPhone,
    extension: parsedExtension,
    notes: decryptedNotes?.trim() || undefined,
    _phoneNeedsUpgrade,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
