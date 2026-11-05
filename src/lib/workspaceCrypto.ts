/**
 * Workspace-Wide Cryptographic Engine for ZipTabs
 * Ensures zero plaintext sensitive metadata in Supabase across:
 * - Drive (drive_files, drive_folders, and storage paths)
 * - Notes & Attachments (app_notes, NoteAttachment metadata, and storage paths)
 * - Invoices (invoices vendor_name, invoice_number, notes, and raw_data)
 * - Vendor Remittances (vendor_remittances file_name, items, and raw_text)
 *
 * Uses PBKDF2-SHA256 (100,000 iterations) + AES-256-GCM authenticated encryption
 * and Salted SHA-256 hashing via the standard Web Crypto API (Browser + Node.js).
 */

import {
  deriveVaultKey,
  encryptVaultPayload,
  decryptVaultPayload,
  sha256SaltedHex,
  VAULT_CRYPTO_SALT,
} from "./crypto";

export const WORKSPACE_MASTER_SECRET = "ziptabs_workspace_vault_pepper_2026_v1";
export const WORKSPACE_KDF_SALT = "ziptabs_workspace_kdf_salt_7d49a2f_2026";
export const WORKSPACE_HASH_SALT = "ziptabs_workspace_hash_salt_3b91e6c_2026";

let cachedWorkspaceKey: CryptoKey | null = null;

export async function getWorkspaceKey(): Promise<CryptoKey> {
  if (cachedWorkspaceKey) return cachedWorkspaceKey;
  cachedWorkspaceKey = await deriveVaultKey(WORKSPACE_MASTER_SECRET, WORKSPACE_KDF_SALT);
  return cachedWorkspaceKey;
}

export async function computeSaltedHash(text: string): Promise<string> {
  return await sha256SaltedHex((text || "").trim().toLowerCase(), WORKSPACE_HASH_SALT);
}

/**
 * Generates an anonymized, salted SHA-256 storage path for Supabase Storage
 * so original filenames are never leaked in bucket object names or public URLs.
 * Preserves the safe file extension so MIME/browser previews work seamlessly.
 */
export async function generateHashedStoragePath(
  prefixFolder: string,
  originalFileName: string,
  uniqueSeed?: string | number
): Promise<string> {
  const rawName = (originalFileName || "file").trim();
  const lastDot = rawName.lastIndexOf(".");
  let ext = "";
  if (lastDot > 0 && lastDot < rawName.length - 1) {
    const candidateExt = rawName.substring(lastDot + 1).toLowerCase().replace(/[^a-z0-9]/g, "");
    if (candidateExt.length > 0 && candidateExt.length <= 8) {
      ext = `.${candidateExt}`;
    }
  }
  const seed = uniqueSeed !== undefined ? String(uniqueSeed) : `${Date.now()}_${Math.random()}`;
  const fileHash = await computeSaltedHash(`${rawName}:${seed}`);
  return `${prefixFolder}/${Date.now()}_${fileHash.slice(0, 24)}${ext}`;
}

/**
 * Encrypts a string into `iv:ciphertext` format using AES-256-GCM.
 */
export async function encryptWorkspaceString(plaintext: string, key?: CryptoKey): Promise<string> {
  const k = key || (await getWorkspaceKey());
  return await encryptVaultPayload(plaintext || "", k);
}

/**
 * Decrypts an `iv:ciphertext` string, or returns the original string if it is legacy plaintext.
 */
export async function decryptWorkspaceString(payload?: string | null, key?: CryptoKey): Promise<string> {
  if (!payload) return "";
  const str = String(payload);
  // Check if it looks like base64_iv:base64_ciphertext (12-byte IV is 16 chars in base64)
  if (!str.includes(":")) return str;
  const colonIdx = str.indexOf(":");
  if (colonIdx < 12 || colonIdx > 24) return str;

  try {
    const k = key || (await getWorkspaceKey());
    return await decryptVaultPayload(str, "", k);
  } catch {
    return str;
  }
}

// ============================================================================
// 1. NOTES & ATTACHMENTS CRYPTO (`public.app_notes`)
// ============================================================================

export function isNoteRowEncrypted(row: any): boolean {
  if (!row) return false;
  if (row.encrypted_payload) return true;
  if (typeof row.title === "string" && row.title.startsWith("[Encrypted] ")) return true;
  if (typeof row.content === "string" && row.content.startsWith("ENCv2:")) return true;
  return false;
}

export async function encryptNoteForDb(
  note: {
    id: string;
    user_id?: string;
    title: string;
    content?: string;
    category: string;
    target_date?: string | null;
    priority?: "normal" | "high" | "urgent";
    is_completed?: boolean;
    attachments?: any[];
    created_at?: string;
    updated_at?: string;
    last_opened_at?: string;
  },
  key?: CryptoKey
) {
  const k = key || (await getWorkspaceKey());
  const cleanTitle = (note.title || "Quick Note").trim();
  const cleanContent = (note.content ?? cleanTitle).trim();
  const attachments = Array.isArray(note.attachments) ? note.attachments : [];

  const [titleHash, contentHash, attachmentsHash] = await Promise.all([
    computeSaltedHash(cleanTitle),
    computeSaltedHash(cleanContent),
    computeSaltedHash(JSON.stringify(attachments.map((a) => a.name || a.id))),
  ]);

  const secretEnvelope = {
    v: 2,
    title: cleanTitle,
    content: cleanContent,
    category: note.category || "Quick Notes",
    attachments,
    hashes: {
      title_hash: titleHash,
      content_hash: contentHash,
      attachments_hash: attachmentsHash,
    },
  };

  const encryptedEnvelope = await encryptWorkspaceString(JSON.stringify(secretEnvelope), k);

  // Anonymize attachment names in the JSONB column so plaintext filenames never appear in DB dumps,
  // while keeping hashed storage paths & sizes intact for storage management.
  const maskedAttachments = await Promise.all(
    attachments.map(async (att) => {
      const nameHash = await computeSaltedHash(att.name || "attachment");
      const encAttPayload = await encryptWorkspaceString(JSON.stringify(att), k);
      return {
        id: att.id,
        name: `[Encrypted] ${nameHash.slice(0, 16)}`,
        name_hash: nameHash,
        size: att.size || 0,
        type: att.type || "application/octet-stream",
        path: att.path || "",
        url: att.url || "",
        encrypted_meta: encAttPayload,
      };
    })
  );

  return {
    id: note.id,
    user_id: note.user_id || "chief",
    title: `[Encrypted] ${titleHash.slice(0, 16)}`,
    content: `ENCv2:${encryptedEnvelope}`,
    category: note.category || "Quick Notes",
    target_date: note.target_date || null,
    priority: note.priority || "normal",
    is_completed: Boolean(note.is_completed),
    attachments: maskedAttachments,
    ...(note.created_at ? { created_at: note.created_at } : {}),
    updated_at: note.updated_at || new Date().toISOString(),
    ...(note.last_opened_at ? { last_opened_at: note.last_opened_at } : {}),
  };
}

export async function decryptNoteFromDb(row: any, key?: CryptoKey): Promise<any> {
  if (!row) return row;
  const k = key || (await getWorkspaceKey());
  const wasEncrypted = isNoteRowEncrypted(row);

  let title = row.title || "";
  let content = row.content || "";
  let category = row.category || "Quick Notes";
  let attachments = Array.isArray(row.attachments) ? row.attachments : [];

  // 1. Check ENCv2 envelope in content or encrypted_payload
  const rawEnvelopeStr =
    typeof row.encrypted_payload === "string" && row.encrypted_payload
      ? row.encrypted_payload
      : typeof row.content === "string" && row.content.startsWith("ENCv2:")
      ? row.content.slice("ENCv2:".length)
      : null;

  if (rawEnvelopeStr) {
    try {
      const decJson = await decryptWorkspaceString(rawEnvelopeStr, k);
      const parsed = JSON.parse(decJson);
      if (parsed && typeof parsed === "object") {
        title = parsed.title || title;
        content = parsed.content ?? content;
        category = parsed.category || category;
        if (Array.isArray(parsed.attachments) && parsed.attachments.length > 0) {
          attachments = parsed.attachments;
        }
      }
    } catch (err) {
      console.warn("Failed to decrypt note envelope:", row.id, err);
    }
  }

  // 2. Also check individual attachments in case any were added via background upload update
  if (Array.isArray(row.attachments) && row.attachments.length > 0) {
    const decryptedAtts = await Promise.all(
      row.attachments.map(async (att: any) => {
        if (att && typeof att.encrypted_meta === "string") {
          try {
            const decAttStr = await decryptWorkspaceString(att.encrypted_meta, k);
            const parsedAtt = JSON.parse(decAttStr);
            if (parsedAtt && parsedAtt.name) {
              return parsedAtt;
            }
          } catch {}
        }
        return att;
      })
    );
    // Merge if row.attachments has newer/more items than envelope
    if (decryptedAtts.length >= attachments.length) {
      attachments = decryptedAtts;
    }
  }

  return {
    ...row,
    title,
    content,
    category,
    attachments,
    _needsEncryptionUpgrade: !wasEncrypted,
  };
}

// ============================================================================
// 2. DRIVE FILES & FOLDERS CRYPTO (`public.drive_files` & `public.drive_folders`)
// ============================================================================

export function isDriveFileRowEncrypted(row: any): boolean {
  if (!row) return false;
  if (row.encrypted_metadata) return true;
  if (typeof row.name === "string" && row.name.startsWith("[Encrypted] ")) return true;
  return false;
}

export async function encryptDriveFileForDb(
  file: {
    id: string;
    user_id?: string;
    folder_id?: string | null;
    name: string;
    size: number;
    type: string;
    storage_path: string;
    public_url?: string;
    retention_type?: "permanent" | "temporary";
    expires_at?: string | null;
    created_at?: string;
    updated_at?: string;
  },
  key?: CryptoKey
) {
  const k = key || (await getWorkspaceKey());
  const cleanName = (file.name || "Untitled_File").trim();
  const [nameHash, pathHash] = await Promise.all([
    computeSaltedHash(cleanName),
    computeSaltedHash(file.storage_path || cleanName),
  ]);

  const metaPayload = {
    v: 2,
    name: cleanName,
    type: file.type || "application/octet-stream",
    storage_path: file.storage_path,
    public_url: file.public_url || "",
    hashes: {
      name_hash: nameHash,
      path_hash: pathHash,
    },
  };

  const encryptedMeta = await encryptWorkspaceString(JSON.stringify(metaPayload), k);

  return {
    id: file.id,
    user_id: file.user_id || "chief",
    folder_id: file.folder_id || null,
    name: `[Encrypted] ${nameHash.slice(0, 16)}`,
    size: file.size || 0,
    type: `ENCv2:${encryptedMeta}`,
    storage_path: file.storage_path,
    public_url: file.public_url || "",
    retention_type: file.retention_type || "permanent",
    expires_at: file.expires_at || null,
    ...(file.created_at ? { created_at: file.created_at } : {}),
    updated_at: file.updated_at || new Date().toISOString(),
  };
}

export async function decryptDriveFileFromDb(row: any, key?: CryptoKey): Promise<any> {
  if (!row) return row;
  const k = key || (await getWorkspaceKey());
  const wasEncrypted = isDriveFileRowEncrypted(row);

  let name = row.name || "";
  let type = row.type || "application/octet-stream";
  let storage_path = row.storage_path || "";
  let public_url = row.public_url || "";

  const rawEnc =
    typeof row.encrypted_metadata === "string" && row.encrypted_metadata
      ? row.encrypted_metadata
      : typeof row.type === "string" && row.type.startsWith("ENCv2:")
      ? row.type.slice("ENCv2:".length)
      : null;

  if (rawEnc) {
    try {
      const decStr = await decryptWorkspaceString(rawEnc, k);
      const parsed = JSON.parse(decStr);
      if (parsed && typeof parsed === "object") {
        name = parsed.name || name;
        type = parsed.type || "application/octet-stream";
        storage_path = parsed.storage_path || storage_path;
        public_url = parsed.public_url || public_url;
      }
    } catch (err) {
      console.warn("Failed to decrypt drive file row:", row.id, err);
    }
  }

  return {
    ...row,
    name,
    type,
    storage_path,
    public_url,
    _needsEncryptionUpgrade: !wasEncrypted,
  };
}

export function isDriveFolderRowEncrypted(row: any): boolean {
  if (!row) return false;
  if (typeof row.name === "string" && row.name.startsWith("ENCv2:")) return true;
  return false;
}

export async function encryptDriveFolderForDb(
  folder: {
    id: string;
    user_id?: string;
    name: string;
    parent_id?: string | null;
    color?: string;
    created_at?: string;
    updated_at?: string;
  },
  key?: CryptoKey
) {
  const k = key || (await getWorkspaceKey());
  const cleanName = (folder.name || "Folder").trim();
  const nameHash = await computeSaltedHash(cleanName);
  const payload = JSON.stringify({
    v: 2,
    name: cleanName,
    name_hash: nameHash,
  });
  const enc = await encryptWorkspaceString(payload, k);

  return {
    id: folder.id,
    user_id: folder.user_id || "chief",
    name: `ENCv2:${enc}`,
    parent_id: folder.parent_id || null,
    color: folder.color || "blue",
    ...(folder.created_at ? { created_at: folder.created_at } : {}),
    updated_at: folder.updated_at || new Date().toISOString(),
  };
}

export async function decryptDriveFolderFromDb(row: any, key?: CryptoKey): Promise<any> {
  if (!row) return row;
  const k = key || (await getWorkspaceKey());
  const wasEncrypted = isDriveFolderRowEncrypted(row);

  let name = row.name || "Folder";
  if (typeof row.name === "string" && row.name.startsWith("ENCv2:")) {
    try {
      const decStr = await decryptWorkspaceString(row.name.slice("ENCv2:".length), k);
      const parsed = JSON.parse(decStr);
      if (parsed && parsed.name) {
        name = parsed.name;
      }
    } catch (err) {
      console.warn("Failed to decrypt drive folder:", row.id, err);
    }
  }

  return {
    ...row,
    name,
    _needsEncryptionUpgrade: !wasEncrypted,
  };
}

// ============================================================================
// 3. INVOICES CRYPTO (`public.invoices`)
// ============================================================================

export function isInvoiceRowEncrypted(row: any): boolean {
  if (!row) return false;
  if (typeof row.vendor_name === "string" && row.vendor_name.startsWith("[Encrypted] ")) return true;
  if (row.raw_data && typeof row.raw_data === "object" && row.raw_data.__enc_v2) return true;
  return false;
}

export async function encryptInvoiceForDb(
  inv: {
    id?: string;
    user_id?: string;
    vendor_name: string;
    invoice_number?: string | null;
    amount: number;
    due_date?: string | null;
    days_overdue: number;
    status?: string;
    notes?: string | null;
    raw_data?: Record<string, any> | null;
  },
  key?: CryptoKey
) {
  const k = key || (await getWorkspaceKey());
  const cleanVendor = (inv.vendor_name || "Unknown Vendor").trim();
  const cleanInvNum = (inv.invoice_number || "").trim();
  const cleanNotes = (inv.notes || "").trim();

  const [vendorHash, invNumHash] = await Promise.all([
    computeSaltedHash(cleanVendor),
    computeSaltedHash(cleanInvNum || cleanVendor),
  ]);

  const secretPayload = {
    v: 2,
    vendor_name: cleanVendor,
    invoice_number: cleanInvNum,
    amount: inv.amount,
    due_date: inv.due_date || null,
    days_overdue: inv.days_overdue,
    status: inv.status || "Overdue",
    notes: cleanNotes,
    raw_data: inv.raw_data || null,
    hashes: {
      vendor_hash: vendorHash,
      invoice_number_hash: invNumHash,
    },
  };

  const encryptedEnvelope = await encryptWorkspaceString(JSON.stringify(secretPayload), k);

  return {
    ...(inv.id ? { id: inv.id } : {}),
    user_id: inv.user_id || "chief",
    vendor_name: `[Encrypted] ${vendorHash.slice(0, 16)}`,
    invoice_number: cleanInvNum ? `[Hashed] ${invNumHash.slice(0, 16)}` : null,
    amount: inv.amount,
    due_date: inv.due_date || null,
    days_overdue: inv.days_overdue,
    status: inv.status || "Overdue",
    notes: `ENCv2:${encryptedEnvelope}`,
    raw_data: {
      __enc_v2: true,
      crypto_algo: "AES-256-GCM + Salted SHA-256",
      vendor_hash: vendorHash,
      invoice_number_hash: invNumHash,
      ciphertext: encryptedEnvelope,
    },
  };
}

export async function decryptInvoiceFromDb(row: any, key?: CryptoKey): Promise<any> {
  if (!row) return row;
  const k = key || (await getWorkspaceKey());
  const wasEncrypted = isInvoiceRowEncrypted(row);

  let vendor_name = row.vendor_name || "Unknown Vendor";
  let invoice_number = row.invoice_number || "";
  let notes = row.notes || "";
  let raw_data = row.raw_data || null;

  const rawCipher =
    row.raw_data && typeof row.raw_data === "object" && typeof row.raw_data.ciphertext === "string"
      ? row.raw_data.ciphertext
      : typeof row.notes === "string" && row.notes.startsWith("ENCv2:")
      ? row.notes.slice("ENCv2:".length)
      : null;

  if (rawCipher) {
    try {
      const decStr = await decryptWorkspaceString(rawCipher, k);
      const parsed = JSON.parse(decStr);
      if (parsed && typeof parsed === "object") {
        vendor_name = parsed.vendor_name || vendor_name;
        invoice_number = parsed.invoice_number ?? invoice_number;
        notes = parsed.notes ?? "";
        raw_data = parsed.raw_data ?? null;
      }
    } catch (err) {
      console.warn("Failed to decrypt invoice row:", row.id, err);
    }
  }

  return {
    ...row,
    vendor_name,
    invoice_number,
    notes,
    raw_data,
    _needsEncryptionUpgrade: !wasEncrypted,
  };
}

// ============================================================================
// 4. VENDOR REMITTANCES CRYPTO (`public.vendor_remittances`)
// ============================================================================

export function isRemittanceRowEncrypted(row: any): boolean {
  if (!row) return false;
  if (typeof row.file_name === "string" && row.file_name.startsWith("[Encrypted] ")) return true;
  if (typeof row.raw_text === "string" && row.raw_text.startsWith("ENCv2:")) return true;
  if (row.items && !Array.isArray(row.items) && row.items.__enc_v2) return true;
  return false;
}

export async function encryptRemittanceForDb(
  rem: {
    id?: string;
    vendor_id: string;
    vendor_name: string;
    file_name: string;
    file_size: number;
    total_paid: number;
    total_gross: number;
    total_discount: number;
    total_deductions: number;
    invoice_count: number;
    items: any[];
    raw_text?: string | null;
    created_at?: string;
    expires_at?: string;
  },
  key?: CryptoKey
) {
  const k = key || (await getWorkspaceKey());
  const cleanFileName = (rem.file_name || "Remittance_Statement").trim();
  const cleanRawText = rem.raw_text ? String(rem.raw_text).slice(0, 5000) : "";
  const itemsArray = Array.isArray(rem.items) ? rem.items : [];

  const [fileHash, itemsHash] = await Promise.all([
    computeSaltedHash(cleanFileName),
    computeSaltedHash(JSON.stringify(itemsArray)),
  ]);

  const secretEnvelope = {
    v: 2,
    vendor_name: rem.vendor_name,
    file_name: cleanFileName,
    items: itemsArray,
    raw_text: cleanRawText,
    hashes: {
      file_name_hash: fileHash,
      items_hash: itemsHash,
    },
  };

  const encryptedEnvelope = await encryptWorkspaceString(JSON.stringify(secretEnvelope), k);

  return {
    ...(rem.id ? { id: rem.id } : {}),
    vendor_id: rem.vendor_id || "pyramid",
    vendor_name: rem.vendor_name || "Pyramid Inc",
    file_name: `[Encrypted] ${fileHash.slice(0, 16)}`,
    file_size: rem.file_size || 0,
    total_paid: Number(rem.total_paid) || 0,
    total_gross: Number(rem.total_gross) || 0,
    total_discount: Number(rem.total_discount) || 0,
    total_deductions: Number(rem.total_deductions) || 0,
    invoice_count: Number(rem.invoice_count) || itemsArray.length || 0,
    items: [
      {
        __enc_v2: true,
        crypto_algo: "AES-256-GCM + Salted SHA-256",
        file_name_hash: fileHash,
        items_hash: itemsHash,
        ciphertext: encryptedEnvelope,
      },
    ],
    raw_text: `ENCv2:${encryptedEnvelope}`,
    ...(rem.created_at ? { created_at: rem.created_at } : {}),
    ...(rem.expires_at ? { expires_at: rem.expires_at } : {}),
  };
}

export async function decryptRemittanceFromDb(row: any, key?: CryptoKey): Promise<any> {
  if (!row) return row;
  const k = key || (await getWorkspaceKey());
  const wasEncrypted = isRemittanceRowEncrypted(row);

  let file_name = row.file_name || "Remittance_Statement";
  let vendor_name = row.vendor_name || "Pyramid Inc";
  let items = Array.isArray(row.items) ? row.items : [];
  let raw_text = row.raw_text || "";

  let rawCipher: string | null = null;
  if (typeof row.raw_text === "string" && row.raw_text.startsWith("ENCv2:")) {
    rawCipher = row.raw_text.slice("ENCv2:".length);
  } else if (
    Array.isArray(row.items) &&
    row.items.length === 1 &&
    row.items[0]?.__enc_v2 &&
    typeof row.items[0]?.ciphertext === "string"
  ) {
    rawCipher = row.items[0].ciphertext;
  }

  if (rawCipher) {
    try {
      const decStr = await decryptWorkspaceString(rawCipher, k);
      const parsed = JSON.parse(decStr);
      if (parsed && typeof parsed === "object") {
        file_name = parsed.file_name || file_name;
        vendor_name = parsed.vendor_name || vendor_name;
        items = Array.isArray(parsed.items) ? parsed.items : [];
        raw_text = parsed.raw_text ?? "";
      }
    } catch (err) {
      console.warn("Failed to decrypt remittance row:", row.id, err);
    }
  }

  return {
    ...row,
    vendor_name,
    file_name,
    items,
    raw_text,
    _needsEncryptionUpgrade: !wasEncrypted,
  };
}
