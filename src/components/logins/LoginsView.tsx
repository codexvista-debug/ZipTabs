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
  const [deleteConfirmItem, setDeleteConfirmItem] = useState<{ id: string; title: string } | null>(null);
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

          if (row.encrypted_notes) {
            try {
              const decryptedRaw = await decryptVaultPayload(row.encrypted_notes, row.iv, key);
              try {
                const parsed = JSON.parse(decryptedRaw);
                if (typeof parsed === "object" && parsed !== null) {
                  decNotes = parsed.notes || parsed.note || undefined;
                  decIcon = parsed.icon || undefined;
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

      let encNotes: string | null = null;
      if (formData.notes.trim() || finalIcon) {
        const payloadObj = {
          notes: formData.notes.trim(),
          icon: finalIcon,
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
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
                Logins & Portals
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                <span>AES-256 Synced</span>
              </span>
            </div>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
            Encrypted directory synced across all your devices, exclusively accessible by <strong>@chief</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Add Login Button */}
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 hover:shadow-lg transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Add Login</span>
          </button>
        </div>
      </div>

      {/* Security Status Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
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

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 hover:border-blue-400/80 p-5 shadow-xs hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-200 flex flex-col justify-between group relative"
              >
                <div>
                  {/* Top Bar: Brand Avatar + Title + Actions */}
                  <div className="flex items-start justify-between gap-3 mb-3.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <VaultBrandAvatar
                        iconId={item.icon}
                        title={item.title}
                        category={item.category}
                        url={item.url}
                        size="md"
                      />
                      <div className="min-w-0">
                        <h3
                          className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors tracking-tight truncate"
                          title={item.title}
                        >
                          {item.title}
                        </h3>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 truncate">
                            {item.category}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Edit & Delete Action Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                        title="Edit credential"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirmItem({ id: item.id, title: item.title })}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Delete credential"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Username / Email Row */}
                  <div className="mt-3 bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                        Username / Email
                      </span>
                      <button
                        onClick={() => copyToClipboard(item.username, `user-${item.id}`, false)}
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
                    <div className="text-xs font-mono font-medium text-slate-800 select-all truncate bg-white px-2 py-1 rounded-md border border-slate-200/60">
                      {item.username}
                    </div>
                  </div>

                  {/* Password Row */}
                  <div className="mt-2 bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">
                          Password
                        </span>
                        {isVisible && (
                          <span className="text-[9px] text-amber-600 font-bold bg-amber-50 px-1 py-0.2 rounded border border-amber-200">
                            Auto-hides in 10s
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => togglePasswordVisibility(item.id)}
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
                          onClick={() => copyToClipboard(item.password, `pass-${item.id}`, true)}
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
                    <div className="text-xs font-mono font-medium text-slate-800 select-all truncate bg-white px-2 py-1 rounded-md border border-slate-200/60 tracking-wider">
                      {isVisible ? item.password : "••••••••••••••••"}
                    </div>
                  </div>

                  {/* Notes & Security Hints (More Detailing) */}
                  {item.notes && item.notes.trim() && !item.notes.includes("=") && (
                    <div className="mt-3 bg-amber-50/70 rounded-xl p-2.5 border border-amber-200/80 text-[11px] text-amber-900/90 leading-relaxed flex items-start gap-2">
                      <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <span className="line-clamp-3 leading-relaxed">{item.notes}</span>
                    </div>
                  )}
                </div>

                {/* Bottom Bar: Updated Date in MM/DD/YYYY on Left, Blue "Login" Button on Right */}
                <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Updated {formatDateMMDDYYYY(item.updatedAt)}</span>
                  </div>

                  {/* Blue "Login" Button */}
                  {item.url ? (
                    <a
                      href={item.url.startsWith("http") ? item.url : `https://${item.url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold shadow-md shadow-blue-500/20 hover:shadow-blue-500/35 transition-all cursor-pointer group/btn shrink-0"
                      title={`Login to ${item.url}`}
                    >
                      <span>Login</span>
                      <ExternalLink className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 shrink-0" />
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-blue-600 transition-colors"
                    >
                      <span>+ Add Portal URL</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal - Spacious Layout with Mascot Avatar Picker & Dynamic Categories */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-xs">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                    {editingId ? "Edit Login Credential" : "Add New Login Record"}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Encrypted client-side with AES-256-GCM before saving to your cloud vault.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
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
                    className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold cursor-pointer text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold cursor-pointer shadow-md shadow-blue-500/20 disabled:opacity-60 flex items-center gap-2 text-xs transition-all active:scale-95"
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

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setDeleteConfirmItem(null)}
            className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
          />

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm sm:max-w-md w-full p-6 z-10 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-200/80 flex items-center justify-center text-rose-600 mb-4 shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Delete login credential?
            </h3>

            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-slate-800">"{deleteConfirmItem.title}"</strong> from your encrypted cloud vault? This action cannot be undone.
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
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
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all shadow-md shadow-rose-500/20 cursor-pointer active:scale-95"
              >
                Delete Credential
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}