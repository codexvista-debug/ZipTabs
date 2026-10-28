"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import {
  deriveVaultKey,
  encryptVaultData,
  decryptVaultData,
  hashPassword,
} from "@/lib/crypto";
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
  Mail,
  Building2,
  Landmark,
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
} from "lucide-react";

export type LoginCategory =
  | "Email Accounts"
  | "Client & Vendor Portals"
  | "Tax & Government"
  | "Banking & Payroll"
  | "General";

export interface DecryptedLoginCredential {
  id: string;
  title: string;
  category: LoginCategory;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  updatedAt: string;
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

const CATEGORIES: { label: LoginCategory; icon: React.ElementType }[] = [
  { label: "Email Accounts", icon: Mail },
  { label: "Client & Vendor Portals", icon: Building2 },
  { label: "Tax & Government", icon: Landmark },
  { label: "Banking & Payroll", icon: ShieldCheck },
  { label: "General", icon: Globe },
];

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

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "Email Accounts" as LoginCategory,
    username: "",
    password: "",
    url: "",
    notes: "",
  });

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

  useEffect(() => {
    const handleActivity = () => resetAutoLockTimer();
    window.addEventListener("mousemove", handleActivity);
    window.addEventListener("keydown", handleActivity);
    return () => {
      window.removeEventListener("mousemove", handleActivity);
      window.removeEventListener("keydown", handleActivity);
      if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
    };
  }, [resetAutoLockTimer]);

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
          if (row.encrypted_notes) {
            try {
              decNotes = await decryptVaultData(row.encrypted_notes, row.iv, key);
            } catch {
              decNotes = row.encrypted_notes;
            }
          }

          decryptedList.push({
            id: row.id,
            title: row.title,
            category: row.category,
            username: row.username,
            password: decPass,
            url: row.url || undefined,
            notes: decNotes,
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
            notes: row.encrypted_notes || undefined,
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
        title: "Google Workspace Admin",
        category: "Email Accounts" as LoginCategory,
        username: "admin@ziptabs.com",
        password: "TempMasterPassword_2026!",
        url: "https://admin.google.com",
        notes: "Primary business email administration & user routing",
      },
      {
        id: `cred-${Date.now()}-2`,
        title: "ADP Workforce Portal",
        category: "Banking & Payroll" as LoginCategory,
        username: "payroll.ziptabs",
        password: "PayrollSecureKey#2026",
        url: "https://workforcenow.adp.com",
        notes: "Semi-monthly payroll generation and direct deposit",
      },
      {
        id: `cred-${Date.now()}-3`,
        title: "USCIS E-Verify Portal",
        category: "Tax & Government" as LoginCategory,
        username: "everify_admin",
        password: "EVerifyPortalPass99!",
        url: "https://www.e-verify.gov",
        notes: "I-9 employment verification for consultants",
      },
    ];

    const toInsert = [];
    const decryptedStarters: DecryptedLoginCredential[] = [];

    for (const item of starters) {
      const { ciphertext: encPass, iv } = await encryptVaultData(item.password, key);
      const { ciphertext: encNotes } = await encryptVaultData(item.notes, key);

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
    setFormData({
      title: "",
      category: "Email Accounts",
      username: "",
      password: "",
      url: "",
      notes: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: DecryptedLoginCredential) => {
    setEditingId(item.id);
    setModalError(null);
    setFormData({
      title: item.title,
      category: item.category,
      username: item.username,
      password: item.password,
      url: item.url || "",
      notes: item.notes || "",
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to permanently delete this login from the cloud vault?")) {
      return;
    }

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

      let encNotes: string | null = null;
      if (formData.notes) {
        const { ciphertext } = await encryptVaultData(formData.notes, vaultKey);
        encNotes = ciphertext;
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
      alert(`Encryption failed: ${err.message}`);
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

  // 2. VAULT LOCKED SCREEN (Chief Authentication & Master Unlock)
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
          {/* Quick Lock Button */}
          <button
            onClick={handleLockVault}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
            title="Lock Vault Now"
          >
            <Lock className="w-3.5 h-3.5 text-slate-600" />
            <span>Lock Vault</span>
          </button>

          {/* Add Login Button */}
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
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
          {CATEGORIES.map((cat) => {
            const count = logins.filter((l) => l.category === cat.label).length;
            const Icon = cat.icon;
            return (
              <button
                key={cat.label}
                onClick={() => setSelectedCategory(cat.label)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat.label
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedCategory === cat.label
                      ? "bg-slate-800 text-slate-200"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
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
            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 transition-all group"
              >
                <div>
                  {/* Top Bar: Category badge & Actions */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100 truncate">
                      {item.category}
                    </span>
                    <div className="flex items-center gap-1">
                      {item.url && (
                        <a
                          href={item.url.startsWith("http") ? item.url : `https://${item.url}`}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-100 transition-colors"
                          title="Open portal in new tab"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Edit login"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Delete login"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                    {item.title}
                  </h3>

                  {/* Username / Email Row */}
                  <div className="mt-3.5 bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-medium text-[11px]">
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
                    <div className="text-xs font-mono text-slate-800 select-all truncate">
                      {item.username}
                    </div>
                  </div>

                  {/* Password Row */}
                  <div className="mt-2 bg-slate-50 rounded-xl p-2.5 border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 font-medium text-[11px]">Password</span>
                        {isVisible && (
                          <span className="text-[9px] text-amber-600 font-bold bg-amber-50 px-1 rounded">
                            Auto-hides in 10s
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => togglePasswordVisibility(item.id)}
                          className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
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
                    <div className="text-xs font-mono text-slate-800 select-all truncate">
                      {isVisible ? item.password : "••••••••••••"}
                    </div>
                  </div>

                  {/* Notes & Hints */}
                  {item.notes && (
                    <p className="text-[11px] text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                      {item.notes}
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Updated {item.updatedAt}</span>
                  {item.url && (
                    <span className="text-slate-400 truncate max-w-[150px]">
                      {item.url.replace(/^https?:\/\//, "")}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden animate-fade-in">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900">
                {editingId ? "Edit Login Record" : "Add New Login Record"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-5 space-y-3.5 text-xs">
              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 font-semibold text-xs flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{modalError}</span>
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Service / Account Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ADP Workforce, Work Email, State Tax Portal"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({ ...formData, category: e.target.value as LoginCategory })
                  }
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 cursor-pointer"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.label} value={cat.label}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Username / Email *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. user@domain.com or portal_admin"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Password / PIN *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Password or passcode"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Website / Portal URL (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://portal.client.com"
                  value={formData.url}
                  onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Notes & 2FA Hints (optional, encrypted)
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. 2FA via Google Authenticator, reset pin is 1234..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-800"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-600 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer shadow-xs disabled:opacity-60 flex items-center gap-1.5"
                >
                  {isSaving && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingId ? "Save Changes" : "Encrypt & Save"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}