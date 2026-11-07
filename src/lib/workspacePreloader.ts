"use client";

import {
  deriveVaultKey,
  decryptVaultData,
  decryptVaultPayload,
  clearDerivedKeyCache,
} from "@/lib/crypto";
import {
  DirectoryRecord,
  getDirectoryKey,
  decryptSupabaseDirectoryRow,
} from "@/lib/directoryCrypto";
import { detectVaultAvatar } from "@/components/logins/VaultBrandAvatar";
import type { DecryptedLoginCredential, VaultLoginLog } from "@/components/logins/LoginsView";
import type { NoteItem } from "@/components/notes/NotesView";
import type { InvoiceRecord } from "@/components/invoices/InvoicesView";
import { calculateAgingDaysFromDueDate } from "@/components/invoices/InvoicesView";
import type { DriveFolder, DriveFile } from "@/components/drive/DriveView";
import { preloadSignedUrls } from "@/lib/storage";

export interface WorkspaceMemoryCache {
  hydratedAt: number;
  directoryRecords: DirectoryRecord[] | null;
  vaultLogins: DecryptedLoginCredential[] | null;
  vaultKey: CryptoKey | null;
  notes: NoteItem[] | null;
  noteCategories: any[] | null;
  invoices: InvoiceRecord[] | null;
  driveFolders: DriveFolder[] | null;
  driveFiles: DriveFile[] | null;
  usageData: any | null;
}

const memoryCache: WorkspaceMemoryCache = {
  hydratedAt: 0,
  directoryRecords: null,
  vaultLogins: null,
  vaultKey: null,
  notes: null,
  noteCategories: null,
  invoices: null,
  driveFolders: null,
  driveFiles: null,
  usageData: null,
};

let activePreloadPromise: Promise<void> | null = null;

export function getWorkspaceCache(): WorkspaceMemoryCache {
  return memoryCache;
}

export function setCachedDirectoryRecords(records: DirectoryRecord[] | null) {
  memoryCache.directoryRecords = records;
}

export function setCachedVaultState(
  logins: DecryptedLoginCredential[] | null,
  key?: CryptoKey | null
) {
  memoryCache.vaultLogins = logins;
  if (key !== undefined) {
    memoryCache.vaultKey = key;
  }
}

export function setCachedNotes(notes: NoteItem[] | null, categories?: any[] | null) {
  memoryCache.notes = notes;
  if (categories !== undefined) {
    memoryCache.noteCategories = categories;
  }
}

export function setCachedInvoices(invoices: InvoiceRecord[] | null) {
  memoryCache.invoices = invoices;
}

export function setCachedDrive(folders: DriveFolder[] | null, files: DriveFile[] | null) {
  memoryCache.driveFolders = folders;
  memoryCache.driveFiles = files;
}

/**
 * Immediately wipes all sensitive decrypted credentials, directory records,
 * and derived AES-256-GCM keys from memory on logout or lockdown.
 */
export function clearWorkspaceCache() {
  memoryCache.hydratedAt = 0;
  memoryCache.directoryRecords = null;
  memoryCache.vaultLogins = null;
  memoryCache.vaultKey = null;
  memoryCache.notes = null;
  memoryCache.noteCategories = null;
  memoryCache.invoices = null;
  memoryCache.driveFolders = null;
  memoryCache.driveFiles = null;
  memoryCache.usageData = null;
  activePreloadPromise = null;
  clearDerivedKeyCache();
}

/**
 * Helper to decrypt raw vault rows using candidate Chief keys in parallel.
 */
export async function decryptRawVaultRows(
  rows: any[],
  userId?: string,
  pin?: string
): Promise<{ logins: DecryptedLoginCredential[]; primaryKey: CryptoKey }> {
  const secretSuffix = pin || "chief_default_vault_2026";
  const primaryUserId = userId || "48164e77-b051-47e0-b72c-a3c07da42dbf";

  const [primaryKey, fallbackUuidKey, fallbackMasterKey] = await Promise.all([
    deriveVaultKey(`ziptabs_chief_${primaryUserId}_${secretSuffix}`),
    deriveVaultKey(`ziptabs_chief_48164e77-b051-47e0-b72c-a3c07da42dbf_${secretSuffix}`),
    deriveVaultKey(`ziptabs_chief_master_${secretSuffix}`),
  ]);

  const candidateKeys = [primaryKey, fallbackUuidKey, fallbackMasterKey];

  const logins = await Promise.all(
    rows.map(async (row): Promise<DecryptedLoginCredential> => {
      try {
        let rowKey: CryptoKey = primaryKey;
        let decPass: string | null = null;
        let lastErr: any = null;

        for (const candidate of candidateKeys) {
          try {
            decPass = await decryptVaultData(row.encrypted_password, row.iv, candidate);
            rowKey = candidate;
            break;
          } catch (err) {
            lastErr = err;
          }
        }

        if (decPass === null) {
          throw lastErr || new Error("Could not decrypt credential password");
        }

        let decTitle = row.title;
        let decCategory = row.category;
        let decUsername = row.username;
        let decPassword = decPass;
        let decUrl: string | undefined = row.url || undefined;
        let decNotes: string | undefined = undefined;
        let decIcon: string | undefined = undefined;
        let decLogs: VaultLoginLog[] | undefined = undefined;
        let decTargetProfile: "profile-1" | "profile-2" | "any" = "profile-1";

        if (row.encrypted_notes) {
          try {
            const decryptedRaw = await decryptVaultPayload(row.encrypted_notes, row.iv, rowKey);
            try {
              const parsed = JSON.parse(decryptedRaw);
              if (typeof parsed === "object" && parsed !== null) {
                if (parsed.v === 2 || parsed.title) {
                  decTitle = parsed.title || row.title;
                  decCategory = parsed.category || row.category;
                  decUsername = parsed.username || row.username;
                  decPassword = parsed.password || decPass;
                  decUrl = parsed.url || row.url || undefined;
                  decNotes = parsed.notes || undefined;
                  decIcon = parsed.icon || undefined;
                  decLogs = Array.isArray(parsed.logs) ? parsed.logs : undefined;
                  decTargetProfile = parsed.targetProfile || "profile-1";
                } else {
                  decNotes = parsed.notes || parsed.note || undefined;
                  decIcon = parsed.icon || undefined;
                  decLogs = Array.isArray(parsed.logs) ? parsed.logs : undefined;
                  decTargetProfile = parsed.targetProfile || "profile-1";
                }
              } else {
                decNotes = decryptedRaw;
              }
            } catch {
              decNotes = decryptedRaw;
            }
          } catch {
            decNotes = undefined;
          }
        }

        if (!decIcon) {
          decIcon = detectVaultAvatar(decTitle, decCategory, decUrl || "");
        }

        return {
          id: row.id,
          title: decTitle,
          category: decCategory,
          username: decUsername,
          password: decPassword,
          url: decUrl,
          notes: decNotes,
          icon: decIcon,
          updatedAt: row.updated_at ? row.updated_at.split("T")[0] : "2026-10-28",
          logs: decLogs,
          targetProfile: decTargetProfile,
        };
      } catch {
        return {
          id: row.id,
          title: row.title,
          category: row.category,
          username: row.username,
          password: "••••••••••••",
          url: row.url || undefined,
          notes: undefined,
          icon: detectVaultAvatar(row.title, row.category, row.url || ""),
          updatedAt: row.updated_at ? row.updated_at.split("T")[0] : "2026-10-28",
        };
      }
    })
  );

  return { logins, primaryKey };
}

/**
 * Preloads and decrypts all workspace tabs concurrently during the initial
 * ZipTabs Portal loading screen so switching tabs is 100% instantaneous.
 */
export async function preloadAllWorkspaceData(
  user: { id: string; username: string; role: string },
  onProgress?: (progress: number, statusText: string) => void
): Promise<void> {
  if (activePreloadPromise) {
    return activePreloadPromise;
  }

  const isChief =
    user?.username?.toLowerCase() === "chief" ||
    user?.role === "Chief Administrator";

  activePreloadPromise = (async () => {
    let completedTasks = 0;
    const totalTasks = isChief ? 5 : 4;

    const bumpProgress = (statusText: string) => {
      completedTasks++;
      const pct = Math.min(98, Math.round(25 + (completedTasks / totalTasks) * 73));
      onProgress?.(pct, statusText);
    };

    onProgress?.(25, "Querying Supabase Cloud Vault...");

    // 1. Preload Notes & Categories
    const notesPromise = (async () => {
      try {
        const res = await fetch("/api/notes", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            const notesList: NoteItem[] = Array.isArray(json.notes) ? json.notes : [];
            const catsList: any[] = Array.isArray(json.categories) ? json.categories : [];
            memoryCache.notes = notesList;
            memoryCache.noteCategories = catsList;
            try {
              localStorage.setItem("ziptabs_app_notes", JSON.stringify(notesList));
            } catch {}
            const pathsToPreload: string[] = [];
            for (const n of notesList) {
              if (Array.isArray(n.attachments)) {
                for (const a of n.attachments) {
                  if (a.path) pathsToPreload.push(a.path);
                }
              }
            }
            if (pathsToPreload.length > 0) {
              preloadSignedUrls(pathsToPreload);
            }
          }
        }
      } catch (err) {
        console.warn("Preload notes error:", err);
      } finally {
        bumpProgress("Hydrating reminders & encrypted notes...");
      }
    })();

    // 2. Preload & Decrypt Phone Directory
    const directoryPromise = (async () => {
      try {
        const [dirRes, key] = await Promise.all([
          fetch("/api/directory", { cache: "no-store" }),
          getDirectoryKey(),
        ]);
        if (dirRes.ok) {
          const dirJson = await dirRes.json();
          if (dirJson.success && Array.isArray(dirJson.data)) {
            const decryptedList = await Promise.all(
              dirJson.data.map(async (rawRow: any) => {
                if (rawRow.name && !rawRow.encrypted_name) {
                  return rawRow as DirectoryRecord;
                }
                try {
                  return await decryptSupabaseDirectoryRow(rawRow, key);
                } catch {
                  return null;
                }
              })
            );
            memoryCache.directoryRecords = decryptedList.filter(Boolean) as DirectoryRecord[];
          }
        }
      } catch (err) {
        console.warn("Preload directory error:", err);
      } finally {
        bumpProgress("Decrypting phone directory contacts...");
      }
    })();

    // 3. Preload & Decrypt Chief Logins Vault (unless explicitly locked in sessionStorage)
    const vaultPromise = (async () => {
      if (!isChief) return;
      try {
        const wasLocked =
          typeof window !== "undefined" &&
          sessionStorage.getItem("ziptabs_vault_locked") === "true";
        if (wasLocked) {
          bumpProgress("Securing AES-256 credentials vault...");
          return;
        }

        const res = await fetch("/api/vault", { cache: "no-store" });
        if (res.ok) {
          const j = await res.json();
          if (j.success && Array.isArray(j.data) && j.data.length > 0) {
            const { logins, primaryKey } = await decryptRawVaultRows(j.data, user.id);
            memoryCache.vaultLogins = logins;
            memoryCache.vaultKey = primaryKey;
          }
        }
      } catch (err) {
        console.warn("Preload vault error:", err);
      } finally {
        bumpProgress("Decrypting AES-256 login credentials...");
      }
    })();

    // 4. Preload Invoices
    const invoicesPromise = (async () => {
      try {
        const res = await fetch("/api/invoices", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            const updated: InvoiceRecord[] = json.data.map((inv: any) => {
              if (inv.due_date && inv.due_date !== "—") {
                const dynamicDays = calculateAgingDaysFromDueDate(inv.due_date);
                return {
                  ...inv,
                  days_overdue: dynamicDays,
                  status:
                    dynamicDays > 0
                      ? inv.status && inv.status !== "Current"
                        ? inv.status
                        : "Overdue"
                      : "Current",
                };
              }
              return inv;
            });
            memoryCache.invoices = updated;
            try {
              sessionStorage.setItem("ziptabs_cached_invoices_v1", JSON.stringify(updated));
            } catch {}
          }
        }
      } catch (err) {
        console.warn("Preload invoices error:", err);
      } finally {
        bumpProgress("Reconciling vendor accounts & invoices...");
      }
    })();

    // 5. Preload Drive & Usage in parallel
    const drivePromise = (async () => {
      try {
        const [driveRes, usageRes] = await Promise.all([
          fetch("/api/drive", { cache: "no-store" }).catch(() => null),
          fetch("/api/usage", { cache: "no-store" }).catch(() => null),
        ]);
        if (driveRes && driveRes.ok) {
          const driveJson = await driveRes.json();
          if (driveJson.success) {
            if (Array.isArray(driveJson.folders)) {
              memoryCache.driveFolders = driveJson.folders;
              try {
                localStorage.setItem("ziptabs_drive_folders", JSON.stringify(driveJson.folders));
              } catch {}
            }
            if (Array.isArray(driveJson.files)) {
              memoryCache.driveFiles = driveJson.files;
              try {
                localStorage.setItem("ziptabs_drive_files", JSON.stringify(driveJson.files));
              } catch {}
              const drivePaths = driveJson.files.map((f: any) => f.storage_path).filter(Boolean);
              if (drivePaths.length > 0) preloadSignedUrls(drivePaths);
            }
          }
        }
        if (usageRes && usageRes.ok) {
          const usageJson = await usageRes.json();
          if (usageJson.success && usageJson.data) {
            memoryCache.usageData = usageJson.data;
          }
        }
      } catch (err) {
        console.warn("Preload drive error:", err);
      } finally {
        bumpProgress("Finalizing executive workspace...");
      }
    })();

    await Promise.all([
      notesPromise,
      directoryPromise,
      vaultPromise,
      invoicesPromise,
      drivePromise,
    ]);

    memoryCache.hydratedAt = Date.now();
    onProgress?.(100, "Workspace Session Ready");
  })();

  try {
    await activePreloadPromise;
  } finally {
    activePreloadPromise = null;
  }
}
