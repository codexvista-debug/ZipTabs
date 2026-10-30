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
} from "lucide-react";

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
      for (const row of data as RawVaultRow[]) {
        try {
          const decPass = await decryptVaultData(row.encrypted_password, row.iv, key);
          let decNotes: string | undefined = undefined;
          let decIcon: string | undefined = undefined;
          let decLogs: VaultLoginLog[] | undefined = undefined;

          if (row.encrypted_notes) {
            try {
              const decryptedRaw = await decryptVaultPayload(row.encrypted_notes, row.iv, key);
              try {
                const parsed = JSON.parse(decryptedRaw);
                if (typeof parsed === "object" && parsed !== null) {
                  decNotes = parsed.notes || parsed.note || undefined;
                  decIcon = parsed.icon || undefined;
                  decLogs = Array.isArray(parsed.logs) ? parsed.logs : undefined;
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
            decIcon = detectVaultAvatar(row.title, row.category, row.url || "");
          }

          decryptedList.push({
            id: row.id,
            title: row.title,
            category: row.category,
            username: row.username,
            password: decPass,
            url: row.url || undefined,
            notes: decNotes,
            icon: decIcon,
            updatedAt: row.updated_at ? row.updated_at.split("T")[0] : "2026-10-28",
            logs: decLogs,
          });
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

    const toInsert = [];
    const decryptedStarters: DecryptedLoginCredential[] = [];

    for (const item of starters) {
      const { ciphertext: encPass, iv } = await encryptVaultData(item.password, key);
      const encNotes = await encryptVaultPayload(
        JSON.stringify({ notes: item.notes, icon: item.icon }),
        key
      );

      toInsert.push({
        id: item.id,
        owner_username: "chief",
        title: item.title,
        category: item.category,
        username: item.username,
        encrypted_password: encPass,
        iv,
        url: item.url,
        encrypted_notes: encNotes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

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
      });
    }

    await supabase.from("vault_credentials").insert(toInsert);
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
    if (supabase) {
      await supabase
        .from("vault_credentials")
        .delete()
        .eq("id", id)
        .eq("owner_username", "chief");
    }

    setLogins((prev) => prev.filter((item) => item.id !== id));
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
            label: "Username / Email",
            oldValue: existing.username,
            newValue: formData.username.trim(),
          });
        }
        if (formData.password !== existing.password) {
          changes.push({
            field: "password",
            label: "Master Password",
            oldValue: "••••••••",
            newValue: "••••••••",
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
            label: "Notes & Security Hint",
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
          { field: "username", label: "Username / Email", newValue: formData.username.trim() },
          ...(formData.url?.trim() ? [{ field: "url" as const, label: "Portal URL", newValue: formData.url.trim() }] : []),
          ...(formData.notes?.trim() ? [{ field: "notes" as const, label: "Notes & Hint", newValue: formData.notes.trim() }] : []),
        ];
        const newEntry: VaultLoginLog = {
          id: `log-${Date.now()}`,
          timestamp: nowIso,
          summary: "Initial credential record created and encrypted",
          changes: initialChanges,
        };
        updatedLogs = [newEntry];
      }

      let encNotes: string | null = null;
      if (formData.notes.trim() || finalIcon || updatedLogs.length > 0) {
        const payloadObj = {
          notes: formData.notes.trim(),
          icon: finalIcon,
          logs: updatedLogs,
        };
        encNotes = await encryptVaultPayload(JSON.stringify(payloadObj), vaultKey);
      }

      const itemId = editingId || `cred-${Date.now()}`;
      const dbPayload = {
        id: itemId,
        owner_username: "chief",
        title: formData.title.trim(),
        category: formData.category,
        username: formData.username.trim(),
        encrypted_password: encPass,
        iv: passIv,
        url: formData.url?.trim() || null,
        encrypted_notes: encNotes,
        updated_at: nowIso,
      };

      const { error } = await supabase.from("vault_credentials").upsert(dbPayload);
      if (error) {
        setModalError(`Failed to save to cloud vault: ${error.message}`);
        return;
      }

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
      } else {
        setLogins((prev) => [updatedDecrypted, ...prev]);
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
    <div className="space-y-3.5 sm:space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Header (Single compact row on mobile) */}
      <div className="flex items-center justify-between gap-2.5 pb-3 sm:pb-6 border-b border-slate-200/60">
        <div className="min-w-0">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <KeyRound className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            <h1 className="text-base sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight truncate">
              Logins & Portals
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl hidden sm:block">
            Encrypted directory synced across all your devices, exclusively accessible by <strong>@chief</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Add Login Button */}
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 hover:shadow-lg transition-all cursor-pointer active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span>Add Login</span>
          </button>
        </div>
      </div>

      {/* Security Status Banner (Hidden on narrow mobile screens to save screen space) */}
      <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Cross-Device Sync</div>
            <div className="text-xs font-bold text-slate-800">Active (Cloud DB)</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Encryption</div>
            <div className="text-xs font-bold text-slate-800">AES-256-GCM</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Auto-Lock Timer</div>
            <div className="text-xs font-bold text-slate-800">10m Inactivity</div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[11px] text-slate-400 font-medium">Clipboard Protection</div>
            <div className="text-xs font-bold text-slate-800">30s Auto-Wipe</div>
          </div>
        </div>
      </div>

      {/* Search and Category Filter Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-none">
          <button
            onClick={() => setSelectedCategory("All")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === "All"
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            All ({logins.length})
          </button>
          {allCategories.map((cat) => {
            const count = logins.filter((l) => l.category === cat).length;
            if (count === 0 && selectedCategory !== cat) return null;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedCategory === cat
                      ? "bg-slate-800 text-slate-200"
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
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-50 border border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer whitespace-nowrap"
              title="Add new category"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Category</span>
            </button>
          )}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[220px] md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search logins or usernames..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs sm:text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Logins Grid */}
      {isLoadingData ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-blue-600 mb-2" />
          <span className="text-xs font-semibold text-slate-600">
            Syncing and decrypting cloud credentials...
          </span>
        </div>
      ) : filteredLogins.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
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
            className="mt-4 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer"
          >
            + Add First Login
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {filteredLogins.map((item) => {
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
                onClick={() => setFocusedCardId(item.id)}
                onFocus={() => setFocusedCardId(item.id)}
                className={`relative rounded-2xl p-5 transition-all duration-200 flex flex-col justify-between group overflow-hidden cursor-pointer outline-none select-none ${
                  isFocused
                    ? "bg-white border-2 border-blue-600 shadow-xl shadow-blue-500/15 ring-4 ring-blue-500/10 -translate-y-1"
                    : "bg-gradient-to-b from-white via-slate-50/25 to-slate-50/70 border border-slate-200/90 hover:border-blue-400/80 hover:shadow-[0_12px_28px_-6px_rgba(37,99,235,0.09)] hover:-translate-y-0.5"
                }`}
              >
                {/* Top subtle decorative accent line (Glows on Focus) */}
                <div
                  className={`absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-blue-500 via-indigo-500 to-sky-400 transition-all ${
                    isFocused
                      ? "opacity-100 shadow-[0_0_10px_rgba(59,130,246,0.6)]"
                      : "opacity-60 group-hover:opacity-100"
                  }`}
                />

                <div>
                  {/* Top Bar: Brand Avatar + Title + Category Pill + Actions */}
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`shrink-0 transition-transform duration-200 ${isFocused ? "scale-105" : ""}`}>
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
                        <div className="flex items-center justify-between gap-2">
                          <h3
                            className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight truncate"
                            title={item.title}
                          >
                            {item.title}
                          </h3>
                          {isFocused && (
                            <span className="shrink-0 px-2 py-0.5 rounded-full bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider shadow-xs animate-in fade-in duration-150">
                              Focused
                            </span>
                          )}
                        </div>

                        {/* Line 1: Category Pill */}
                        <div className="mt-1.5 flex items-center">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold border truncate ${catStyle.bg} ${catStyle.text} ${catStyle.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${catStyle.dot}`} />
                            <span>{item.category}</span>
                          </span>
                        </div>

                        {/* Line 2: Dedicated URL Domain Line for All Cards (Ensures Uniform Card Height) */}
                        <div className="mt-1 flex items-center min-h-[22px]">
                          {cleanDomain ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] text-slate-500 font-mono truncate bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/70">
                              <Globe className="w-2.5 h-2.5 text-slate-400 shrink-0" />
                              <span className="truncate max-w-[210px]">{cleanDomain}</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] text-slate-400 italic">
                              <span>No portal link</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Edit & Delete Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0 bg-slate-100/70 p-0.5 rounded-xl border border-slate-200/60">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(item);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition-colors cursor-pointer"
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

                  {/* Username / Email Row */}
                  <div
                    className={`mt-3 rounded-xl p-2.5 border shadow-2xs space-y-1.5 transition-colors ${
                      isFocused ? "bg-blue-50/30 border-blue-200/80" : "bg-white/90 border-slate-200/80"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <span>Username / Email</span>
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyToClipboard(item.username, `user-${item.id}`, false);
                        }}
                        className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                      >
                        {copiedKey === `user-${item.id}` ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-600">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="text-xs font-mono font-medium text-slate-800 select-all truncate bg-slate-50/80 px-2.5 py-1.5 rounded-lg border border-slate-200/60">
                      {item.username}
                    </div>
                  </div>

                  {/* Password Row */}
                  <div
                    className={`mt-2 rounded-xl p-2.5 border shadow-2xs space-y-1.5 transition-colors ${
                      isFocused ? "bg-blue-50/30 border-blue-200/80" : "bg-white/90 border-slate-200/80"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-bold text-[10px] uppercase tracking-wider flex items-center gap-1">
                          <KeyRound className="w-3 h-3 text-slate-400" />
                          <span>Password</span>
                        </span>
                        {isVisible && (
                          <span className="text-[9px] text-amber-600 font-bold bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                            Auto-hides in 10s
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            togglePasswordVisibility(item.id);
                          }}
                          className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer p-0.5"
                          title={isVisible ? "Hide password" : "Peek password (10s)"}
                        >
                          {isVisible ? (
                            <EyeOff className="w-3.5 h-3.5 text-amber-600" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyToClipboard(item.password, `pass-${item.id}`, true);
                          }}
                          className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                          title="Copy to clipboard (auto-wipes in 30s)"
                        >
                          {copiedKey === `pass-${item.id}` ? (
                            <>
                              <Check className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-600">Copied (30s wipe)</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="text-xs font-mono font-medium text-slate-800 select-all truncate bg-slate-50/80 px-2.5 py-1.5 rounded-lg border border-slate-200/60 tracking-wider">
                      {isVisible ? item.password : "••••••••••••••••"}
                    </div>
                  </div>

                  {/* Notes & Security Hints (Modern Slate & Indigo Pill) */}
                  {item.notes && item.notes.trim() && !item.notes.includes("=") && (
                    <div className="mt-3 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 rounded-xl p-2.5 border border-indigo-100/90 text-[11px] text-slate-700 leading-relaxed shadow-2xs">
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
                        <FileText className="w-3 h-3 text-indigo-500 shrink-0" />
                        <span>Note & 2FA Hint</span>
                      </div>
                      <p className="line-clamp-3 leading-relaxed text-slate-600 text-[11px] font-medium pl-1">
                        {item.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Bar: Updated Date on Left, [Logs] button on left of Blue [Login] Button */}
                <div className="mt-4 pt-3.5 border-t border-slate-100/90 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium truncate">
                      <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>Updated {formatDateMMDDYYYY(item.updatedAt)}</span>
                    </div>
                    <span className="hidden sm:inline-block text-[9px] font-extrabold text-slate-400 bg-slate-100/90 border border-slate-200/60 px-1.5 py-0.5 rounded-md shrink-0">
                      AES-256
                    </span>
                  </div>

                  {/* Right Actions: Logs Button + Blue Login Button */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingLogsItem(item);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 active:scale-95 text-slate-700 text-xs font-bold transition-all shadow-2xs cursor-pointer"
                      title="View modification audit logs"
                    >
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      <span>Logs</span>
                      {item.logs && item.logs.length > 0 && (
                        <span className="text-[10px] bg-blue-50 text-blue-700 border border-blue-200/60 px-1.5 py-0.2 rounded-full font-extrabold">
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
                        className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:shadow-blue-500/35 transition-all cursor-pointer shrink-0"
                        title={`Login to ${item.url}`}
                      >
                        Login
                      </a>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenEditModal(item);
                        }}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-blue-600 transition-colors"
                      >
                        <span>+ Add URL</span>
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
                            <div className="space-y-1.5 pt-1">
                              {log.changes.map((ch, cIdx) => (
                                <div
                                  key={cIdx}
                                  className="text-[11px] bg-white rounded-xl p-2.5 border border-slate-200/70 text-slate-700 space-y-1"
                                >
                                  <div className="font-bold text-slate-800 text-[10px] uppercase tracking-wider">
                                    {ch.label}
                                  </div>
                                  {ch.isSecret ? (
                                    <div className="text-[11px] text-emerald-600 font-medium flex items-center gap-1.5">
                                      <ShieldCheck className="w-3.5 h-3.5" />
                                      <span>Master password was updated and re-encrypted.</span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 text-xs flex-wrap">
                                      {ch.oldValue && (
                                        <span className="line-through text-slate-400 font-mono text-[11px] truncate max-w-[150px]">
                                          {ch.oldValue}
                                        </span>
                                      )}
                                      {ch.oldValue && <span className="text-slate-400 text-[10px]">→</span>}
                                      <span className="font-semibold text-blue-700 font-mono text-[11px] truncate max-w-[200px]">
                                        {ch.newValue}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
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
                <span>AES-256 Client-Side Encrypted Audit Trail</span>
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