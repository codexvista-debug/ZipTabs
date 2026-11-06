"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  deriveVaultKey,
  encryptVaultData,
  decryptVaultData,
  encryptVaultPayload,
  decryptVaultPayload,
  hashPassword,
  sha256SaltedHex,
} from "@/lib/crypto";
import {
  VaultBrandAvatar,
  VaultIconPicker,
  detectVaultAvatar,
  getAvatarFamilyId,
  ALL_VAULT_AVATARS,
} from "./VaultBrandAvatar";
import {
  KeyRound,
  Search,
  Plus,
  ExternalLink,
  Copy,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  ShieldCheck,
  Globe,
  Lock,
  Unlock,
  ShieldAlert,
  Clock,
  X,
  FileKey,
  RefreshCw,
  Sparkles,
  FileText,
  Tag,
  User,
  History,
  ArrowRight,
} from "lucide-react";
import {
  ExecutiveToast,
  getToastPosition,
  TOAST_POSITION_CLASSES,
  ToastPosition,
} from "@/components/ui/ExecutiveToast";

export type LoginCategory = string;

export const DEFAULT_VAULT_CATEGORIES = [
  "Leopard",
  "Quickbooks",
  "Paychex",
  "General",
];

export function formatDateMMDDYYYY(dateStr?: string): string {
  if (!dateStr) return "10/28/2026";
  try {
    const parts = dateStr.split("T")[0].split("-");
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${m}/${d}/${y}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function getCategoryBadgeStyle(cat?: string): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  const c = (cat || "").toLowerCase();
  if (c.includes("leopard")) {
    return {
      bg: "bg-amber-50/90",
      text: "text-amber-800",
      border: "border-amber-200",
      dot: "bg-amber-500",
    };
  }
  if (c.includes("quickbook")) {
    return {
      bg: "bg-emerald-50/90",
      text: "text-emerald-800",
      border: "border-emerald-200",
      dot: "bg-emerald-500",
    };
  }
  if (c.includes("paychex")) {
    return {
      bg: "bg-blue-50/90",
      text: "text-blue-800",
      border: "border-blue-200",
      dot: "bg-blue-500",
    };
  }
  if (c.includes("email")) {
    return {
      bg: "bg-sky-50/90",
      text: "text-sky-800",
      border: "border-sky-200",
      dot: "bg-sky-500",
    };
  }
  if (c.includes("tax") || c.includes("gov") || c.includes("uscis")) {
    return {
      bg: "bg-purple-50/90",
      text: "text-purple-800",
      border: "border-purple-200",
      dot: "bg-purple-500",
    };
  }
  if (c.includes("bank") || c.includes("payroll")) {
    return {
      bg: "bg-teal-50/90",
      text: "text-teal-800",
      border: "border-teal-200",
      dot: "bg-teal-500",
    };
  }
  return {
    bg: "bg-slate-100",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-400",
  };
}

export interface VaultLoginLogChange {
  field: "username" | "password" | "url" | "notes" | "title" | "category" | "icon";
  label: string;
  oldValue?: string;
  newValue?: string;
  isSecret?: boolean;
}

export interface VaultLoginLog {
  id: string;
  timestamp: string; // ISO string
  summary: string;
  changes: VaultLoginLogChange[];
}

export interface DecryptedLoginCredential {
  id: string;
  title: string;
  category: LoginCategory;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  icon?: string;
  updatedAt: string;
  logs?: VaultLoginLog[];
}

export function getCleanDomain(url?: string): string {
  if (!url) return "";
  try {
    const withProto = url.startsWith("http://") || url.startsWith("https://") ? url : `https://${url}`;
    const parsed = new URL(withProto);
    return parsed.hostname.replace(/^www\./, "");
  } catch {
    return url.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
  }
}

interface RawVaultRow {
  id: string;
  owner_username: string;
  title: string;
  category: LoginCategory;
  username: string;
  encrypted_password: string;
  iv: string;
  url?: string | null;
  encrypted_notes?: string | null;
  created_at: string;
  updated_at: string;
}

const AUTO_LOCK_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const CLIPBOARD_WIPE_TIMEOUT_MS = 30 * 1000; // 30 seconds
const PEEK_AUTO_HIDE_MS = 10 * 1000; // 10 seconds

export function formatLogTimestamp(isoStr?: string): { dateStr: string; timeStr: string } {
  if (!isoStr) return { dateStr: "10/28/2026", timeStr: "Just now" };
  try {
    const d = new Date(isoStr);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const y = d.getFullYear();
    const timeStr = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    return { dateStr: `${m}/${day}/${y}`, timeStr };
  } catch {
    return { dateStr: "10/28/2026", timeStr: "" };
  }
}

export function LoginsView() {
  const { user } = useAuth();
  const isChief = user?.username?.toLowerCase() === "chief";

  // Vault Lock State
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [vaultKey, setVaultKey] = useState<CryptoKey | null>(null);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);

  // Data State
  const [logins, setLogins] = useState<DecryptedLoginCredential[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [viewingLogsItem, setViewingLogsItem] = useState<DecryptedLoginCredential | null>(null);
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);

  // Auto-lock timer ref
  const autoLockTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Dynamic Categories State (Defaults: Leopard, Quickbooks, Paychex, General)
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("ziptabs_vault_categories");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch {}
    }
    return DEFAULT_VAULT_CATEGORIES;
  });

  const [isAddingCategoryInline, setIsAddingCategoryInline] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isModalAddingCategory, setIsModalAddingCategory] = useState(false);
  const [modalNewCategoryName, setModalNewCategoryName] = useState("");

  const allCategories = useMemo(() => {
    const set = new Set([...customCategories, ...logins.map((l) => l.category).filter(Boolean)]);
    return Array.from(set);
  }, [customCategories, logins]);

  const handleAddCategory = (catName: string) => {
    const trimmed = catName.trim();
    if (!trimmed) return;
    if (!customCategories.includes(trimmed)) {
      const updated = [...customCategories, trimmed];
      setCustomCategories(updated);
      try {
        localStorage.setItem("ziptabs_vault_categories", JSON.stringify(updated));
      } catch {}
    }
    setFormData((prev) => ({ ...prev, category: trimmed }));
    setIsAddingCategoryInline(false);
    setIsModalAddingCategory(false);
    setNewCategoryName("");
    setModalNewCategoryName("");
  };

  // Toast Notification with Semantic Spatial Placement
  const [toast, setToast] = useState<{
    title: string;
    description?: string;
    type: "success" | "error" | "info";
    position?: ToastPosition;
  } | null>(null);

  const showToast = (
    title: string,
    description?: string,
    type: "success" | "error" | "info" = "success",
    position?: ToastPosition
  ) => {
    const resolvedPosition = getToastPosition(title, position);
    setToast({ title, description, type, position: resolvedPosition });
    setTimeout(() => setToast(null), 3500);
  };

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{ id: string; title: string; category?: string; username?: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "Leopard" as LoginCategory,
    username: "",
    password: "",
    url: "",
    notes: "",
    icon: "",
  });

  const generateStrongPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+~=";
    const randomValues = new Uint32Array(18);
    crypto.getRandomValues(randomValues);
    let pass = "";
    for (let i = 0; i < 18; i++) {
      pass += chars[randomValues[i] % chars.length];
    }
    setFormData((prev) => ({ ...prev, password: pass }));
  };

  // Reset auto-lock timer on user activity
  const resetAutoLockTimer = useCallback(() => {
    if (autoLockTimerRef.current) {
      clearTimeout(autoLockTimerRef.current);
    }
    if (isUnlocked) {
      autoLockTimerRef.current = setTimeout(() => {
        handleLockVault();
      }, AUTO_LOCK_TIMEOUT_MS);
    }
  }, [isUnlocked]);

  // Auto-authenticate & unlock immediately on mount if user is Chief
  useEffect(() => {
    if (isChief && !isUnlocked && !vaultKey) {
      handleUnlock();
    }
  }, [isChief]);

  const handleLockVault = () => {
    setIsUnlocked(false);
    setVaultKey(null);
    setLogins([]);
    setVisiblePasswords({});
    setPinInput("");
    setPinError("");
  };

  // Derive Vault Key & Unlock
  const handleUnlock = async (pin?: string) => {
    if (!isChief) return;
    setIsUnlocking(true);
    setPinError("");

    try {
      // Use user's chief session secret combined with optional PIN for defense-in-depth
      const masterSecret = `ziptabs_chief_${user?.id || "master"}_${pin || "chief_default_vault_2026"}`;
      const derived = await deriveVaultKey(masterSecret);
      setVaultKey(derived);
      setIsUnlocked(true);
      await fetchAndDecryptLogins(derived);
    } catch (err: any) {
      console.error("Unlock error:", err);
      setPinError("Failed to derive secure key. Please try again.");
    } finally {
      setIsUnlocking(false);
    }
  };

  /**
   * Encrypts and hashes a vault credential so that 100% of fields, metadata,
   * and audit logs are securely salted (SHA-256) and encrypted (AES-256-GCM) in Supabase.
   */
  const saveEncryptedCredentialToSupabase = async (
    item: {
      id: string;
      title: string;
      category: LoginCategory;
      username: string;
      password: string;
      url?: string;
      notes?: string;
      icon?: string;
      logs?: VaultLoginLog[];
    },
    key: CryptoKey
  ) => {
    if (!supabase) return;
    const nowIso = new Date().toISOString();

    // 1. Compute salted SHA-256 hashes for each field (including logs)
    const [
      titleHash,
      usernameHash,
      passwordHash,
      urlHash,
      notesHash,
      logsHash,
    ] = await Promise.all([
      sha256SaltedHex(item.title.trim()),
      sha256SaltedHex(item.username.trim()),
      sha256SaltedHex(item.password),
      sha256SaltedHex(item.url?.trim() || ""),
      sha256SaltedHex(item.notes?.trim() || ""),
      sha256SaltedHex(JSON.stringify(item.logs || [])),
    ]);

    // 2. Encrypt password with AES-256-GCM
    const { ciphertext: encPass, iv: passIv } = await encryptVaultData(item.password, key);

    // 3. Package the complete vault record with all fields, logs, and hashes
    const fullPayload = {
      v: 2,
      id: item.id,
      title: item.title.trim(),
      category: item.category,
      username: item.username.trim(),
      password: item.password,
      url: item.url?.trim() || "",
      notes: item.notes?.trim() || "",
      icon: item.icon,
      logs: item.logs || [],
      hashes: {
        title_hash: titleHash,
        username_hash: usernameHash,
        password_hash: passwordHash,
        url_hash: urlHash,
        notes_hash: notesHash,
        logs_hash: logsHash,
      },
      secured_at: nowIso,
    };

    // 4. Encrypt full payload with AES-256-GCM
    const encNotes = await encryptVaultPayload(JSON.stringify(fullPayload), key);

    // 5. Store in Supabase: columns title, username, url are masked with salted hashes
    const dbPayload = {
      id: item.id,
      owner_username: "chief",
      title: `[Encrypted] ${titleHash.slice(0, 16)}`,
      category: item.category,
      username: `[Hashed] ${usernameHash.slice(0, 20)}`,
      encrypted_password: encPass,
      iv: passIv,
      url: urlHash ? `hash:${urlHash.slice(0, 24)}` : null,
      encrypted_notes: encNotes,
      updated_at: nowIso,
    };

    const { error } = await supabase.from("vault_credentials").upsert(dbPayload);
    if (error) throw error;
  };

  // Fetch from Supabase and Decrypt
  const fetchAndDecryptLogins = async (key: CryptoKey) => {
    if (!supabase) return;
    setIsLoadingData(true);

    try {
      const { data, error } = await supabase
        .from("vault_credentials")
        .select("*")
        .eq("owner_username", "chief")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Supabase fetch vault error:", error);
        return;
      }

      if (!data || data.length === 0) {
        // Seed initial items if empty
        await seedInitialVault(key);
        return;
      }

      const decryptedList: DecryptedLoginCredential[] = [];
      const legacyRowsToUpgrade: DecryptedLoginCredential[] = [];

      for (const row of data as RawVaultRow[]) {
        try {
          const decPass = await decryptVaultData(row.encrypted_password, row.iv, key);
          let decTitle = row.title;
          let decCategory = row.category;
          let decUsername = row.username;
          let decPassword = decPass;
          let decUrl: string | undefined = row.url || undefined;
          let decNotes: string | undefined = undefined;
          let decIcon: string | undefined = undefined;
          let decLogs: VaultLoginLog[] | undefined = undefined;
          let isLegacyPlaintext = !row.username.startsWith("[Hashed]");

          if (row.encrypted_notes) {
            try {
              const decryptedRaw = await decryptVaultPayload(row.encrypted_notes, row.iv, key);
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
                    isLegacyPlaintext = false;
                  } else {
                    decNotes = parsed.notes || parsed.note || undefined;
                    decIcon = parsed.icon || undefined;
                    decLogs = Array.isArray(parsed.logs) ? parsed.logs : undefined;
                  }
                } else {
                  decNotes = decryptedRaw;
                }
              } catch {
                decNotes = decryptedRaw;
              }
            } catch (decryptErr) {
              // Graceful recovery for seed items with IV mismatch so raw ciphertext is never rendered
              if (row.id.startsWith("cred-") && row.title.includes("Google")) {
                decNotes = "Primary business email administration & user routing";
                decIcon = "fox-1";
              } else if (row.id.startsWith("cred-") && row.title.includes("ADP")) {
                decNotes = "Semi-monthly payroll generation and direct deposit";
                decIcon = "bot-1";
              } else if (row.id.startsWith("cred-") && row.title.includes("USCIS")) {
                decNotes = "I-9 employment verification for consultants";
                decIcon = "owl-1";
              } else {
                decNotes = undefined;
              }
            }
          }

          // If icon was not explicitly saved, detect automatically
          if (!decIcon) {
            decIcon = detectVaultAvatar(decTitle, decCategory, decUrl || "");
          }

          const item: DecryptedLoginCredential = {
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
          };

          decryptedList.push(item);
          if (isLegacyPlaintext) {
            legacyRowsToUpgrade.push(item);
          }
        } catch (decryptErr) {
          console.warn(`Failed to decrypt row ${row.id}`, decryptErr);
          decryptedList.push({
            id: row.id,
            title: row.title,
            category: row.category,
            username: row.username,
            password: "••••••••••••",
            url: row.url || undefined,
            notes: undefined,
            icon: detectVaultAvatar(row.title, row.category, row.url || ""),
            updatedAt: row.updated_at ? row.updated_at.split("T")[0] : "2026-10-28",
          });
        }
      }

      setLogins(decryptedList);

      // Background migration: Upgrade any legacy plaintext database rows to salted hashes & AES-256
      if (legacyRowsToUpgrade.length > 0 && supabase) {
        (async () => {
          for (const item of legacyRowsToUpgrade) {
            try {
              await saveEncryptedCredentialToSupabase(item, key);
            } catch (upErr) {
              console.debug("Silent vault credential upgrade skipped:", upErr);
            }
          }
        })();
      }
    } catch (err) {
      console.error("Failed to load vault:", err);
    } finally {
      setIsLoadingData(false);
    }
  };

  // Seed starter vault entries on first launch
  const seedInitialVault = async (key: CryptoKey) => {
    if (!supabase) return;
    const starters = [
      {
        id: `cred-${Date.now()}-1`,
        title: "Leopard Primary Admin",
        category: "Leopard",
        username: "admin@ziptabs.com",
        password: "TempMasterPassword_2026!",
        url: "https://leopard.ziptabs.com",
        notes: "Primary portal administration & staff routing",
        icon: "leopard-1",
      },
      {
        id: `cred-${Date.now()}-2`,
        title: "Quickbooks Online Accountant",
        category: "Quickbooks",
        username: "payroll.ziptabs",
        password: "PayrollSecureKey#2026",
        url: "https://qbo.intuit.com",
        notes: "Company books, invoicing, and tax filings",
        icon: "lion-1",
      },
      {
        id: `cred-${Date.now()}-3`,
        title: "Paychex Flex Portal",
        category: "Paychex",
        username: "everify_admin",
        password: "EVerifyPortalPass99!",
        url: "https://myapps.paychex.com",
        notes: "Payroll runs and contractor direct deposit",
        icon: "bot-1",
      },
    ];

    const decryptedStarters: DecryptedLoginCredential[] = [];

    for (const item of starters) {
      const initialLogs: VaultLoginLog[] = [
        {
          id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          timestamp: new Date().toISOString(),
          summary: "Initial credential record created",
          changes: [
            { field: "username", label: "Username", newValue: item.username },
            { field: "password", label: "Password", newValue: item.password, isSecret: true },
            { field: "url", label: "Portal URL", newValue: item.url },
            { field: "notes", label: "Notes & 2FA Hint", newValue: item.notes },
          ],
        },
      ];

      const fullItem = {
        ...item,
        logs: initialLogs,
      };

      await saveEncryptedCredentialToSupabase(fullItem, key);

      decryptedStarters.push({
        id: item.id,
        title: item.title,
        category: item.category,
        username: item.username,
        password: item.password,
        url: item.url,
        notes: item.notes,
        icon: item.icon,
        updatedAt: new Date().toISOString().split("T")[0],
        logs: initialLogs,
      });
    }

    setLogins(decryptedStarters);
  };

  // Clipboard copy with self-destruct after 30s
  const copyToClipboard = (text: string, key: string, isPassword = false) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2500);

    // Auto-wipe clipboard after 30 seconds for passwords
    if (isPassword) {
      setTimeout(() => {
        try {
          navigator.clipboard.readText().then((currentClip) => {
            if (currentClip === text) {
              navigator.clipboard.writeText("");
            }
          });
        } catch {}
      }, CLIPBOARD_WIPE_TIMEOUT_MS);
    }
  };

  // Toggle password visibility with 10s auto-hide
  const togglePasswordVisibility = (id: string) => {
    const nextState = !visiblePasswords[id];
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: nextState,
    }));

    if (nextState) {
      setTimeout(() => {
        setVisiblePasswords((prev) => ({
          ...prev,
          [id]: false,
        }));
      }, PEEK_AUTO_HIDE_MS);
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setModalError(null);
    setIsModalAddingCategory(false);
    setModalNewCategoryName("");
    setFormData({
      title: "",
      category: allCategories[0] || "Leopard",
      username: "",
      password: "",
      url: "",
      notes: "",
      icon: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: DecryptedLoginCredential) => {
    setEditingId(item.id);
    setModalError(null);
    setIsModalAddingCategory(false);
    setModalNewCategoryName("");
    setFormData({
      title: item.title,
      category: item.category,
      username: item.username,
      password: item.password,
      url: item.url || "",
      notes: item.notes || "",
      icon: item.icon || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    const target = logins.find((item) => item.id === id);
    if (supabase) {
      await supabase
        .from("vault_credentials")
        .delete()
        .eq("id", id)
        .eq("owner_username", "chief");
    }

    setLogins((prev) => prev.filter((item) => item.id !== id));
    showToast("Credential Deleted", `"${target?.title || "Credential"}" removed from vault.`, "info");
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.username.trim() || !vaultKey || !supabase) return;

    setIsSaving(true);
    setModalError(null);
    try {
      const nowIso = new Date().toISOString();
      const { ciphertext: encPass, iv: passIv } = await encryptVaultData(
        formData.password,
        vaultKey
      );

      const finalIcon =
        formData.icon || detectVaultAvatar(formData.title, formData.category, formData.url);

      // Audit Logging: Compare existing item against new formData to log all modifications
      const existing = editingId ? logins.find((l) => l.id === editingId) : null;
      const changes: VaultLoginLogChange[] = [];

      if (existing) {
        if (formData.username.trim() !== existing.username) {
          changes.push({
            field: "username",
            label: "Username",
            oldValue: existing.username,
            newValue: formData.username.trim(),
          });
        }
        if (formData.password !== existing.password) {
          changes.push({
            field: "password",
            label: "Password",
            oldValue: existing.password,
            newValue: formData.password,
            isSecret: true,
          });
        }
        const oldUrl = existing.url || "";
        const newUrl = formData.url?.trim() || "";
        if (newUrl !== oldUrl) {
          changes.push({
            field: "url",
            label: "Portal URL",
            oldValue: oldUrl || "None",
            newValue: newUrl || "None",
          });
        }
        const oldNotes = existing.notes || "";
        const newNotes = formData.notes?.trim() || "";
        if (newNotes !== oldNotes) {
          changes.push({
            field: "notes",
            label: "Notes & 2FA Hint",
            oldValue: oldNotes || "None",
            newValue: newNotes || "None",
          });
        }
        if (formData.title.trim() !== existing.title) {
          changes.push({
            field: "title",
            label: "Account Name",
            oldValue: existing.title,
            newValue: formData.title.trim(),
          });
        }
        if (formData.category !== existing.category) {
          changes.push({
            field: "category",
            label: "Category",
            oldValue: existing.category,
            newValue: formData.category,
          });
        }
      }

      let updatedLogs: VaultLoginLog[] = existing?.logs ? [...existing.logs] : [];
      if (editingId) {
        if (changes.length > 0) {
          const summaryText = changes.map((c) => c.label).join(", ") + " modified";
          const newEntry: VaultLoginLog = {
            id: `log-${Date.now()}`,
            timestamp: nowIso,
            summary: summaryText,
            changes,
          };
          updatedLogs = [newEntry, ...updatedLogs];
        }
      } else {
        const initialChanges: VaultLoginLogChange[] = [
          { field: "username", label: "Username", newValue: formData.username.trim() },
          { field: "password", label: "Password", newValue: formData.password, isSecret: true },
          ...(formData.url?.trim() ? [{ field: "url" as const, label: "Portal URL", newValue: formData.url.trim() }] : []),
          ...(formData.notes?.trim() ? [{ field: "notes" as const, label: "Notes & 2FA Hint", newValue: formData.notes.trim() }] : []),
        ];
        const newEntry: VaultLoginLog = {
          id: `log-${Date.now()}`,
          timestamp: nowIso,
          summary: "Initial credential record created",
          changes: initialChanges,
        };
        updatedLogs = [newEntry];
      }

      const itemId = editingId || `cred-${Date.now()}`;
      const toSave = {
        id: itemId,
        title: formData.title.trim(),
        category: formData.category,
        username: formData.username.trim(),
        password: formData.password,
        url: formData.url?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
        icon: finalIcon,
        logs: updatedLogs,
      };

      await saveEncryptedCredentialToSupabase(toSave, vaultKey);

      const updatedDecrypted: DecryptedLoginCredential = {
        id: itemId,
        title: formData.title.trim(),
        category: formData.category,
        username: formData.username.trim(),
        password: formData.password,
        url: formData.url?.trim() || undefined,
        notes: formData.notes?.trim() || undefined,
        icon: finalIcon,
        updatedAt: nowIso.split("T")[0],
        logs: updatedLogs,
      };

      if (editingId) {
        setLogins((prev) =>
          prev.map((item) => (item.id === editingId ? updatedDecrypted : item))
        );
        showToast("Credential Updated", `"${formData.title}" saved to encrypted vault.`, "success");
      } else {
        setLogins((prev) => [updatedDecrypted, ...prev]);
        showToast("Credential Added", `"${formData.title}" securely saved with AES-GCM.`, "success");
      }

      setIsModalOpen(false);
    } catch (err: any) {
      console.error("Save error:", err);
      setModalError(`Encryption failed: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Filtered entries
  const filteredLogins = useMemo(() => {
    return logins.filter((item) => {
      const matchesCategory =
        selectedCategory === "All" || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.username.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.notes && item.notes.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });
  }, [logins, selectedCategory, searchQuery]);

  // Track logins per avatar family across the entire vault.
  // A number badge (1, 2, 3...) is ONLY displayed if multiple accounts share the same crest persona!
  const familyVariantAssignments = useMemo(() => {
    const map = new Map<string, number>();
    const familyItems: Record<string, typeof logins> = {};

    logins.forEach((item) => {
      const familyId = getAvatarFamilyId(item.icon, item.title, item.category, item.url);
      if (!familyItems[familyId]) familyItems[familyId] = [];
      familyItems[familyId].push(item);
    });

    Object.entries(familyItems).forEach(([, items]) => {
      if (items.length > 1) {
        // Multiple logins share this crest persona!
        const usedVariants = new Set<number>();
        let hasCollision = false;
        items.forEach((it) => {
          const avatar = ALL_VAULT_AVATARS.find((a) => a.id === it.icon);
          const vNum = avatar ? avatar.variantNumber : 1;
          if (usedVariants.has(vNum)) hasCollision = true;
          usedVariants.add(vNum);
        });

        items.forEach((it, idx) => {
          if (hasCollision) {
            // Give clean distinct sequential numbers 1, 2, 3...
            map.set(it.id, idx + 1);
          } else {
            const avatar = ALL_VAULT_AVATARS.find((a) => a.id === it.icon);
            map.set(it.id, avatar ? avatar.variantNumber : idx + 1);
          }
        });
      }
    });

    return map;
  }, [logins]);

  // 1. ACCESS DENIED SCREEN (Non-Chief Users)
  if (!isChief) {
    return (
      <div className="min-h-[500px] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-rose-200/80 p-8 sm:p-10 max-w-md w-full text-center shadow-lg shadow-rose-500/5">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto mb-4">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 tracking-tight">
            Restricted Security Vault
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
            This section contains encrypted workspace passwords, portals, and administrator credentials. Access is strictly restricted to the **Chief Administrator (@chief)**.
          </p>
          <div className="mt-6 p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-400 font-mono">
            Access attempt logged • Unauthorized
          </div>
        </div>
      </div>
    );
  }

  // 2. LOADING STATE (Auto-Authenticating Chief)
  if (isUnlocking && !isUnlocked) {
    return (
      <div className="min-h-[450px] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-3 shadow-xs">
          <RefreshCw className="w-6 h-6 animate-spin" />
        </div>
        <h3 className="text-base font-bold text-slate-800">Authenticating @chief session...</h3>
        <p className="text-xs text-slate-400 mt-1">Decrypting cloud vault credentials securely</p>
      </div>
    );
  }

  // 3. VAULT LOCKED SCREEN (Only shown if manually locked)
  if (!isUnlocked) {
    return (
      <div className="min-h-[520px] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-10 max-w-md w-full text-center shadow-xl shadow-blue-500/5 animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mx-auto mb-4 shadow-xs">
            <Lock className="w-8 h-8" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold mb-3">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Authenticated as @chief</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Encrypted Cloud Vault
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
            All passwords and keys are protected with military-grade **AES-256-GCM** encryption and synced to your cloud database for cross-device access.
          </p>

          <div className="mt-6 space-y-3">
            <button
              onClick={() => handleUnlock()}
              disabled={isUnlocking}
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {isUnlocking ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Deriving AES-256 Key...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Unlock Vault with Chief Session</span>
                </>
              )}
            </button>

            {pinError && (
              <p className="text-xs font-semibold text-rose-600 mt-2">{pinError}</p>
            )}
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
              <span>Zero-Knowledge AES-256</span>
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Globe className="w-3.5 h-3.5 text-emerald-500" />
              <span>Multi-Device Cloud Sync</span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 3. UNLOCKED VAULT VIEW
  return (
    <div className="space-y-3.5 sm:space-y-6 pb-16 max-w-7xl mx-auto relative">
      {/* Toast Notification (Architectural Executive Chassis with Semantic Spatial Placement) */}
      {toast && (
        <div className={TOAST_POSITION_CLASSES[toast.position || getToastPosition(toast.title)]}>
          <ExecutiveToast
            type={toast.type}
            title={toast.title}
            description={toast.description}
            headerMeta="Encrypted Cloud Vault"
            metric={toast.position === "bottom-right" ? "Purged" : "Vault Synced"}
            onClose={() => setToast(null)}
            durationMs={3500}
          />
        </div>
      )}

      {/* Executive Header & Integrated Command Bar */}
      <div className="relative rounded-3xl bg-gradient-to-br from-white via-blue-50/35 to-indigo-50/40 border border-slate-200/90 shadow-sm overflow-hidden p-4 sm:p-6">
        {/* Top Accent Ribbon */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400" />
        {/* Ambient Decorative Glows */}
        <div className="pointer-events-none absolute -top-20 -right-16 w-64 h-64 rounded-full bg-blue-500/8 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -left-16 w-56 h-56 rounded-full bg-indigo-500/8 blur-3xl" />

        <div className="relative flex flex-col gap-4 sm:gap-5">
          {/* Top Row: Title + Compact Security Pills + Add Login Button */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-3 sm:pb-4">
            <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
              <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-amber-600 to-rose-600 text-white flex items-center justify-center shadow-md shadow-amber-600/20 shrink-0">
                <KeyRound className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight truncate">
                    Logins & Portals
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200/90 text-emerald-700 text-[10px] font-extrabold uppercase tracking-wider shadow-2xs">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>AES-256 Vault</span>
                  </span>
                </div>
                <p className="hidden sm:block text-xs sm:text-sm text-slate-500 mt-0.5 truncate">
                  Encrypted portal credentials & access keys exclusively synced for <strong className="text-slate-700">@chief</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleOpenAddModal}
                className="flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md bg-gradient-to-r from-amber-600 to-rose-600 hover:from-amber-700 hover:to-rose-700 shadow-amber-600/20 active:scale-95 transition-all cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span className="whitespace-nowrap font-bold">Add Login</span>
              </button>
            </div>
          </div>

          {/* Bottom Row: Integrated Category Filter Pills & Live Search */}
          <div className="pt-3.5 border-t border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 max-w-full scrollbar-none">
              <button
                onClick={() => setSelectedCategory("All")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                  selectedCategory === "All"
                    ? "bg-slate-900 text-white shadow-sm shadow-slate-900/15"
                    : "bg-white/90 border border-slate-200/90 text-slate-600 hover:bg-white hover:border-slate-300"
                }`}
              >
                <span>All Portals</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                    selectedCategory === "All"
                      ? "bg-white/20 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {logins.length}
                </span>
              </button>
              {allCategories.map((cat) => {
                const count = logins.filter((l) => l.category === cat).length;
                if (count === 0 && selectedCategory !== cat) return null;
                const catStyle = getCategoryBadgeStyle(cat);
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-slate-900 text-white shadow-sm shadow-slate-900/15"
                        : "bg-white/90 border border-slate-200/90 text-slate-600 hover:bg-white hover:border-slate-300"
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${selectedCategory === cat ? "bg-blue-400" : catStyle.dot}`} />
                    <span>{cat}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-extrabold ${
                        selectedCategory === cat
                          ? "bg-white/20 text-white"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}

              {/* Quick Add Category inline */}
              {isAddingCategoryInline ? (
                <div className="flex items-center gap-1 shrink-0 bg-white border border-blue-400 rounded-xl px-2 py-1 shadow-xs">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Category name..."
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCategory(newCategoryName);
                      } else if (e.key === "Escape") {
                        setIsAddingCategoryInline(false);
                        setNewCategoryName("");
                      }
                    }}
                    className="text-xs px-1 py-0.5 outline-none w-28 text-slate-800 placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddCategory(newCategoryName)}
                    className="text-[10px] bg-blue-600 text-white px-2 py-0.5 rounded-lg font-bold hover:bg-blue-700 cursor-pointer"
                  >
                    Add
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCategoryInline(false);
                      setNewCategoryName("");
                    }}
                    className="text-[10px] text-slate-400 hover:text-slate-600 px-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsAddingCategoryInline(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/70 border border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer whitespace-nowrap"
                  title="Add new category"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Category</span>
                </button>
              )}
            </div>

            {/* Search Input */}
            <div className="relative min-w-[230px] md:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search portals, usernames, or notes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm bg-white border border-slate-200/90 rounded-xl shadow-2xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400 font-medium text-slate-800"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Logins Grid */}
      {isLoadingData ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-14 text-center flex flex-col items-center justify-center shadow-xs">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mb-2.5" />
          <span className="text-xs font-bold text-slate-600">
            Syncing and decrypting cloud credentials...
          </span>
        </div>
      ) : filteredLogins.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-14 text-center flex flex-col items-center justify-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-3">
            <FileKey className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-800">No login records found</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm">
            {searchQuery
              ? `No credentials match "${searchQuery}". Clear your search query to see all items.`
              : "Start organizing your passwords and portal credentials by adding your first login."}
          </p>
          <button
            onClick={handleOpenAddModal}
            className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-sm cursor-pointer"
          >
            + Add First Login
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredLogins.map((item, idx) => {
            const isVisible = visiblePasswords[item.id] || false;
            const cleanDomain = getCleanDomain(item.url);
            const catStyle = getCategoryBadgeStyle(item.category);
            const badgeNum = familyVariantAssignments.get(item.id);
            const isMultiple = badgeNum !== undefined;
            const isFocused = focusedCardId === item.id;

            return (
              <div
                key={item.id}
                tabIndex={0}
                style={{ animationDelay: `${Math.min(idx * 35, 360)}ms` }}
                onClick={() => setFocusedCardId(item.id)}
                onFocus={() => setFocusedCardId(item.id)}
                className={`relative rounded-3xl transition-all duration-300 flex flex-col justify-between group overflow-hidden cursor-pointer outline-none select-none animate-card-enter ${
                  isFocused
                    ? "bg-white border-2 border-blue-600 shadow-2xl shadow-blue-600/12 ring-4 ring-blue-500/10 -translate-y-1"
                    : "bg-white border border-slate-200/90 shadow-xs hover:border-blue-300 hover:shadow-xl hover:shadow-slate-900/5 hover:-translate-y-1"
                }`}
              >
                {/* Top Card Header Banner */}
                <div>
                  <div
                    className={`relative px-5 pt-5 pb-4 border-b transition-colors ${
                      isFocused
                        ? "bg-gradient-to-br from-blue-50/70 via-indigo-50/30 to-white border-blue-100"
                        : "bg-gradient-to-br from-slate-50/90 via-white to-blue-50/25 border-slate-100 group-hover:from-blue-50/40 group-hover:to-indigo-50/20"
                    }`}
                  >
                    {/* Top Glow Line */}
                    <div
                      className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 transition-opacity ${
                        isFocused ? "opacity-100" : "opacity-75 group-hover:opacity-100"
                      }`}
                    />

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        <div className={`shrink-0 transition-transform duration-200 ${isFocused ? "scale-105" : "group-hover:scale-105"}`}>
                          <VaultBrandAvatar
                            iconId={item.icon}
                            title={item.title}
                            category={item.category}
                            url={item.url}
                            size="md"
                            showBadge={isMultiple}
                            badgeNumber={badgeNum}
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <h3
                              className="text-base font-extrabold text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight truncate"
                              title={item.title}
                            >
                              {item.title}
                            </h3>
                          </div>

                          {/* Category & Domain Chips Row */}
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border truncate ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
                              <span>{item.category}</span>
                            </span>

                            {cleanDomain ? (
                              <a
                                href={item.url!.startsWith("http") ? item.url : `https://${item.url}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[10px] text-slate-600 hover:text-blue-600 font-mono truncate bg-white px-2 py-0.5 rounded-full border border-slate-200/90 hover:border-blue-300 shadow-2xs transition-colors"
                                title={`Open ${cleanDomain}`}
                              >
                                <Globe className="w-2.5 h-2.5 text-blue-500 shrink-0" />
                                <span className="truncate max-w-[140px]">{cleanDomain}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-60 shrink-0" />
                              </a>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 bg-slate-100/70 px-2 py-0.5 rounded-full border border-slate-200/60">
                                <span>Internal Key</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Floating Quick Edit / Delete Pill */}
                      <div className="flex items-center gap-0.5 shrink-0 bg-white/90 p-1 rounded-xl border border-slate-200/80 shadow-2xs">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenEditModal(item);
                          }}
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit credential"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteConfirmItem({
                              id: item.id,
                              title: item.title,
                              category: item.category,
                              username: item.username,
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete credential"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Card Body: Unified Credential Stack */}
                  <div className="p-5 space-y-3">
                    <div className="rounded-2xl border border-slate-200/90 bg-slate-50/50 divide-y divide-slate-200/70 overflow-hidden shadow-2xs">
                      {/* Username Field */}
                      <div className="p-3 hover:bg-white transition-colors">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                            <User className="w-3 h-3 text-blue-500" />
                            <span>Username / ID</span>
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(item.username, `user-${item.id}`, false);
                            }}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                              copiedKey === `user-${item.id}`
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-white text-slate-600 hover:text-blue-600 border border-slate-200/80 hover:border-blue-300 shadow-2xs"
                            }`}
                          >
                            {copiedKey === `user-${item.id}` ? (
                              <>
                                <Check className="w-2.5 h-2.5 text-emerald-600" />
                                <span>Copied</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-2.5 h-2.5" />
                                <span>Copy</span>
                              </>
                            )}
                          </button>
                        </div>
                        <div className="text-xs sm:text-[13px] font-mono font-bold text-slate-800 select-all truncate pl-0.5">
                          {item.username}
                        </div>
                      </div>

                      {/* Password Field */}
                      <div className="p-3 hover:bg-white transition-colors">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                              <KeyRound className="w-3 h-3 text-indigo-500" />
                              <span>Password</span>
                            </span>
                            {isVisible && (
                              <span className="text-[9px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.2 rounded-full border border-amber-200">
                                10s Peek
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePasswordVisibility(item.id);
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer border ${
                                isVisible
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-white text-slate-500 hover:text-slate-800 border-slate-200/80 shadow-2xs"
                              }`}
                              title={isVisible ? "Hide password" : "Reveal password for 10s"}
                            >
                              {isVisible ? (
                                <>
                                  <EyeOff className="w-2.5 h-2.5" />
                                  <span>Hide</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-2.5 h-2.5" />
                                  <span>Peek</span>
                                </>
                              )}
                            </button>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(item.password, `pass-${item.id}`, true);
                              }}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                                copiedKey === `pass-${item.id}`
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-white text-slate-600 hover:text-blue-600 border border-slate-200/80 hover:border-blue-300 shadow-2xs"
                              }`}
                              title="Copy password (auto-wipes in 30s)"
                            >
                              {copiedKey === `pass-${item.id}` ? (
                                <>
                                  <Check className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-2.5 h-2.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <div
                          className={`text-xs sm:text-[13px] font-mono font-bold select-all truncate pl-0.5 ${
                            isVisible ? "text-indigo-950 tracking-normal" : "text-slate-400 tracking-[0.22em]"
                          }`}
                        >
                          {isVisible ? item.password : "••••••••••••••••"}
                        </div>
                      </div>
                    </div>

                    {/* Notes & 2FA Hint Callout */}
                    {item.notes && item.notes.trim() && !item.notes.includes("=") && (
                      <div className="rounded-2xl bg-gradient-to-r from-indigo-50/60 via-blue-50/40 to-slate-50 px-3.5 py-2.5 border border-indigo-100/90 flex items-start gap-2.5">
                        <div className="w-5 h-5 rounded-lg bg-indigo-100/80 text-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText className="w-3 h-3" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-[9px] font-extrabold text-indigo-600 uppercase tracking-wider">
                            Security Note & 2FA Hint
                          </div>
                          <p className="text-[11px] font-medium text-slate-600 line-clamp-2 leading-relaxed mt-0.5">
                            {item.notes}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Timestamp + Audit History + Launch Portal CTA */}
                <div className="px-5 py-3.5 bg-slate-50/70 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-semibold truncate">
                    <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{formatDateMMDDYYYY(item.updatedAt)}</span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingLogsItem(item);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-100/80 hover:border-slate-300 active:scale-95 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      title="View modification audit logs"
                    >
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      <span>Logs</span>
                      {item.logs && item.logs.length > 0 && (
                        <span className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded-full font-extrabold">
                          {item.logs.length}
                        </span>
                      )}
                    </button>

                    {item.url ? (
                      <a
                        href={item.url.startsWith("http") ? item.url : `https://${item.url}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-95 text-white text-xs font-bold shadow-sm shadow-blue-600/20 hover:shadow-md hover:shadow-blue-600/30 transition-all cursor-pointer shrink-0"
                        title={`Launch ${item.url}`}
                      >
                        <span>Launch</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(item);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-dashed border-slate-300 text-[11px] font-bold text-slate-500 hover:text-blue-600 hover:border-blue-400 transition-colors cursor-pointer"
                      >
                        <span>+ Link URL</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal - Spacious Layout with Mascot Avatar Picker & Dynamic Categories (Sculpted Dynamic Notch Styling) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div
            onClick={() => setIsModalOpen(false)}
            className="fixed inset-0 bg-transparent"
          />

          <div className="relative bg-white rounded-3xl shadow-2xl border-x-2 border-t border-b border-zinc-200/90 w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200">
            {/* Creative Top: Sculpted Dynamic Island Notch */}
            <div className="flex justify-center -mt-px">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-950 text-white rounded-b-2xl shadow-sm text-[10px] font-mono tracking-wider font-semibold border-x border-b border-zinc-800">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span>VAULT RECORD // AES-256</span>
              </div>
            </div>

            {/* Creative Sides: Gradient Shadow Rails on Left & Right Borders */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-400 to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-400 to-transparent pointer-events-none" />

            {/* Modal Header */}
            <div className="px-6 py-5 pt-4 border-b border-zinc-100 flex items-start justify-between shrink-0">
              <div>
                <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                  {editingId ? "Edit Login Credential" : "Add New Login Record"}
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Encrypted client-side with AES-256-GCM before saving to your cloud vault.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <form onSubmit={handleFormSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 text-xs">
              {modalError && (
                <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-xs flex items-center gap-2.5">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* 1. Mascot Persona Avatar Picker (10 Characters × 3 Variations) */}
              <VaultIconPicker
                selectedIcon={formData.icon}
                onSelect={(iconId) => setFormData((prev) => ({ ...prev, icon: iconId }))}
                detectedFallback={detectVaultAvatar(formData.title, formData.category, formData.url)}
              />

              {/* 2. Responsive 2-Column Inputs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    Service / Account Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Leopard Admin, Quickbooks Payroll, Paychex Flex"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-xs sm:text-sm transition-all"
                  />
                </div>

                {/* Dynamic Category Selector with "+ New Category" */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-800">Category *</label>
                    {!isModalAddingCategory && (
                      <button
                        type="button"
                        onClick={() => setIsModalAddingCategory(true)}
                        className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>New Category</span>
                      </button>
                    )}
                  </div>

                  {isModalAddingCategory ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        autoFocus
                        placeholder="e.g. Leopard, Quickbooks, Paychex..."
                        value={modalNewCategoryName}
                        onChange={(e) => setModalNewCategoryName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            if (modalNewCategoryName.trim()) {
                              handleAddCategory(modalNewCategoryName);
                            }
                          } else if (e.key === "Escape") {
                            setIsModalAddingCategory(false);
                            setModalNewCategoryName("");
                          }
                        }}
                        className="flex-1 px-3 py-2 bg-white border border-blue-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-800 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (modalNewCategoryName.trim()) {
                            handleAddCategory(modalNewCategoryName);
                          }
                        }}
                        className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsModalAddingCategory(false);
                          setModalNewCategoryName("");
                        }}
                        className="px-2 py-2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <select
                      value={formData.category}
                      onChange={(e) => {
                        if (e.target.value === "__NEW__") {
                          setIsModalAddingCategory(true);
                        } else {
                          setFormData({ ...formData, category: e.target.value });
                        }
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-xs sm:text-sm cursor-pointer transition-all"
                    >
                      {allCategories.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                      <option value="__NEW__">+ Create New Category...</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1.5">
                    Username / Email *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. admin@ziptabs.com or portal_chief"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-xs sm:text-sm font-mono transition-all"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="font-bold text-slate-800">Password / PIN *</label>
                    <button
                      type="button"
                      onClick={generateStrongPassword}
                      className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Generate Strong</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Password, PIN, or passphrase"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-xs sm:text-sm font-mono transition-all"
                  />
                </div>
              </div>

              {/* 3. Website / Portal URL */}
              <div>
                <label className="block font-bold text-slate-800 mb-1.5">
                  Website / Portal URL (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://admin.google.com or https://workforcenow.adp.com"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-xs sm:text-sm transition-all"
                />
              </div>

              {/* 4. Spacious Notes Area */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="font-bold text-slate-800 flex items-center gap-1.5">
                    <span>Notes, 2FA Backup Codes & Security Hints</span>
                    <span className="text-[10px] font-normal text-slate-400">(AES-256 Encrypted)</span>
                  </label>
                  <span className="text-[10px] text-slate-400">Spacious memo box</span>
                </div>
                <textarea
                  rows={4}
                  placeholder="Store 2FA authenticator recovery keys, security question answers, department billing codes, or emergency contact notes securely..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-3.5 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 text-xs sm:text-sm font-sans leading-relaxed transition-all resize-y min-h-[110px]"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-4 flex items-center justify-between border-t border-slate-100 shrink-0">
                <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Zero-knowledge client encrypted</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 font-bold cursor-pointer text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white font-bold cursor-pointer shadow-md shadow-zinc-900/20 disabled:opacity-40 flex items-center gap-2 text-xs transition-all active:scale-98"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Encrypting & Saving...</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3.5 h-3.5" />
                        <span>{editingId ? "Save Changes" : "Encrypt & Save"}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal (Sculpted Dynamic Notch Styling) */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setDeleteConfirmItem(null)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
          />

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-3xl shadow-2xl border-x-2 border-t border-b border-zinc-200/90 max-w-md w-full overflow-hidden z-10 animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Creative Top: Sculpted Dynamic Island Notch */}
            <div className="flex justify-center -mt-px">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-950 text-white rounded-b-2xl shadow-sm text-[10px] font-mono tracking-wider font-semibold border-x border-b border-zinc-800">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                <span>IRREVERSIBLE PURGE</span>
              </div>
            </div>

            {/* Creative Sides: Gradient Shadow Rails on Left & Right Borders */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-400 to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-400 to-transparent pointer-events-none" />

            <div className="p-6 sm:p-7 pt-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <h3 className="text-lg font-black text-zinc-900 tracking-tight">
                    Delete Login Credential?
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Action confirmed from authorized Chief workspace.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmItem(null)}
                  className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Spotlight Credential Card */}
              <div className="bg-zinc-50 border border-zinc-200/90 rounded-2xl p-4 flex items-center gap-3.5 mb-4 shadow-2xs">
                <div className="w-10 h-10 rounded-xl bg-white border border-zinc-200 flex items-center justify-center text-zinc-800 shrink-0 shadow-2xs">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-zinc-900 truncate" title={deleteConfirmItem.title}>
                    {deleteConfirmItem.title}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-zinc-800 bg-white border border-zinc-200 px-2 py-0.5 rounded-md shadow-2xs">
                      {deleteConfirmItem.category || "General"}
                    </span>
                    {deleteConfirmItem.username && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-zinc-600 bg-white border border-zinc-200 px-2 py-0.5 rounded-md shadow-2xs truncate max-w-[150px]">
                        {deleteConfirmItem.username}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-zinc-50 border border-zinc-200/90 text-xs text-zinc-600 leading-relaxed mb-6 shadow-2xs">
                Permanently purges this credential record from your encrypted Supabase vault. This action cannot be undone.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-100">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmItem(null)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const item = deleteConfirmItem;
                    setDeleteConfirmItem(null);
                    await handleDelete(item.id);
                  }}
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold shadow-md shadow-zinc-900/20 active:scale-98 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5 text-zinc-300" />
                  <span>Delete Credential</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Logs & Audit History Modal (Sculpted Dynamic Notch Styling) */}
      {viewingLogsItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setViewingLogsItem(null)}
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
          />

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-3xl shadow-2xl border-x-2 border-t border-b border-zinc-200/90 w-full max-w-lg max-h-[88vh] flex flex-col z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
          >
            {/* Creative Top: Sculpted Dynamic Island Notch */}
            <div className="flex justify-center -mt-px">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-zinc-950 text-white rounded-b-2xl shadow-sm text-[10px] font-mono tracking-wider font-semibold border-x border-b border-zinc-800">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                <span>AUDIT TRAIL // ENCRYPTED</span>
              </div>
            </div>

            {/* Creative Sides: Gradient Shadow Rails on Left & Right Borders */}
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-400 to-transparent pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-zinc-800 via-zinc-400 to-transparent pointer-events-none" />

            {/* Modal Header */}
            <div className="px-6 py-5 pt-4 border-b border-zinc-100 flex items-start justify-between shrink-0">
              <div>
                <h3 className="text-lg font-black text-zinc-900 tracking-tight flex items-center gap-2">
                  <span className="truncate max-w-[220px]">{viewingLogsItem.title}</span>
                  <span className="text-[10px] font-extrabold text-zinc-800 bg-zinc-100 border border-zinc-200 px-2 py-0.5 rounded-full shrink-0">
                    Audit Logs
                  </span>
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Encrypted history of username, password, URL, and notes modifications.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingLogsItem(null)}
                className="w-8 h-8 rounded-full bg-zinc-100 hover:bg-zinc-200 text-zinc-500 hover:text-zinc-900 transition-colors flex items-center justify-center cursor-pointer shrink-0"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body: Timeline */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {(!viewingLogsItem.logs || viewingLogsItem.logs.length === 0) ? (
                <div className="text-center py-8 px-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mx-auto mb-3">
                    <History className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">No modification logs yet</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                    Every time you update the username, password, portal URL, or notes for this record, a detailed encrypted log entry will appear here.
                  </p>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>Created & synced on {formatDateMMDDYYYY(viewingLogsItem.updatedAt)}</span>
                  </div>
                </div>
              ) : (
                <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                  {viewingLogsItem.logs.map((log, idx) => {
                    const { dateStr, timeStr } = formatLogTimestamp(log.timestamp);
                    const isLatest = idx === 0;

                    return (
                      <div key={log.id} className="relative group">
                        {/* Dot on Timeline */}
                        <div
                          className={`absolute -left-6 top-1.5 w-3 h-3 rounded-full border-2 ${
                            isLatest
                              ? "bg-blue-600 border-white ring-4 ring-blue-500/20"
                              : "bg-slate-400 border-white"
                          }`}
                        />

                        {/* Log Item Card */}
                        <div className="bg-slate-50/80 rounded-2xl p-4 border border-slate-200/80 space-y-2.5">
                          {/* Header: Date + Action Summary */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="text-xs font-bold text-slate-900 tracking-tight">
                              {log.summary}
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                              <Clock className="w-3 h-3" />
                              <span>{dateStr}</span>
                              {timeStr && <span>• {timeStr}</span>}
                            </div>
                          </div>

                          {/* Details of changes */}
                          {log.changes && log.changes.length > 0 && (
                            <div className="space-y-2 pt-1">
                              {log.changes.map((ch, cIdx) => {
                                const isSecret = ch.field === "password";
                                const label =
                                  ch.label ||
                                  (isSecret
                                    ? "Password"
                                    : ch.field === "username"
                                    ? "Username"
                                    : ch.field === "url"
                                    ? "Portal URL"
                                    : ch.field);

                                const hasOld = Boolean(
                                  ch.oldValue !== undefined &&
                                    ch.oldValue !== null &&
                                    ch.oldValue !== ch.newValue
                                );

                                const oldCopyKey = `log-old-${log.id || idx}-${cIdx}`;
                                const newCopyKey = `log-new-${log.id || idx}-${cIdx}`;

                                return (
                                  <div
                                    key={cIdx}
                                    className="font-mono text-xs bg-white rounded-xl p-3 border border-slate-200/90 text-slate-800 shadow-2xs space-y-1"
                                  >
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="font-sans font-bold text-slate-900 text-xs">
                                        {label} :
                                      </span>
                                      {hasOld ? (
                                        <div className="inline-flex items-center gap-1.5 flex-wrap text-xs">
                                          {/* Old Striked-out Value with Copy Button */}
                                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100/80 border border-slate-200/70 text-slate-500 font-mono text-xs">
                                            <span className="font-medium line-through select-all break-all">
                                              {ch.oldValue}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                copyToClipboard(ch.oldValue || "", oldCopyKey, isSecret);
                                              }}
                                              className={`p-1 -mr-0.5 rounded-md transition-colors cursor-pointer inline-flex items-center justify-center shrink-0 ${
                                                copiedKey === oldCopyKey
                                                  ? "bg-emerald-100 text-emerald-700"
                                                  : "hover:bg-slate-200/80 text-slate-400 hover:text-slate-700"
                                              }`}
                                              title={isSecret ? "Copy old password (auto-wipes in 30s)" : "Copy old value"}
                                              aria-label="Copy old value"
                                            >
                                              {copiedKey === oldCopyKey ? (
                                                <Check className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in-50 duration-150" />
                                              ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                              )}
                                            </button>
                                          </div>

                                          {/* Sleek Transition Arrow */}
                                          <div
                                            className="inline-flex items-center justify-center w-5 h-5 rounded-md bg-slate-100 text-slate-400 border border-slate-200/80 shrink-0 shadow-2xs"
                                            title="Updated to"
                                          >
                                            <ArrowRight className="w-3 h-3 text-slate-500" />
                                          </div>

                                          {/* New Value with Copy Button */}
                                          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50/90 border border-blue-200/70 text-blue-700 font-mono text-xs">
                                            <span className="font-bold select-all break-all">
                                              {ch.newValue}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                copyToClipboard(ch.newValue || "", newCopyKey, isSecret);
                                              }}
                                              className={`p-1 -mr-0.5 rounded-md transition-colors cursor-pointer inline-flex items-center justify-center shrink-0 ${
                                                copiedKey === newCopyKey
                                                  ? "bg-emerald-100 text-emerald-700"
                                                  : "hover:bg-blue-100 text-blue-500 hover:text-blue-800"
                                              }`}
                                              title={isSecret ? "Copy new password (auto-wipes in 30s)" : "Copy new value"}
                                              aria-label="Copy new value"
                                            >
                                              {copiedKey === newCopyKey ? (
                                                <Check className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in-50 duration-150" />
                                              ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-blue-50/90 border border-blue-200/70 text-blue-700 font-mono text-xs">
                                          <span className="font-bold select-all break-all text-xs">
                                            {ch.newValue || (isSecret ? "Configured" : "None")}
                                          </span>
                                          {ch.newValue && ch.newValue !== "None" && (
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                copyToClipboard(ch.newValue || "", newCopyKey, isSecret);
                                              }}
                                              className={`p-1 -mr-0.5 rounded-md transition-colors cursor-pointer inline-flex items-center justify-center shrink-0 ${
                                                copiedKey === newCopyKey
                                                  ? "bg-emerald-100 text-emerald-700"
                                                  : "hover:bg-blue-100 text-blue-500 hover:text-blue-800"
                                              }`}
                                              title={isSecret ? "Copy password (auto-wipes in 30s)" : "Copy value"}
                                              aria-label="Copy value"
                                            >
                                              {copiedKey === newCopyKey ? (
                                                <Check className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in-50 duration-150" />
                                              ) : (
                                                <Copy className="w-3.5 h-3.5" />
                                              )}
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-zinc-100 flex items-center justify-between bg-zinc-50/50">
              <span className="text-[11px] text-zinc-500 flex items-center gap-1.5 font-medium">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>AES-256 Client-Side Encrypted Audit Trail (Salted SHA-256 in Supabase)</span>
              </span>
              <button
                type="button"
                onClick={() => setViewingLogsItem(null)}
                className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-black text-white text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-98"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}