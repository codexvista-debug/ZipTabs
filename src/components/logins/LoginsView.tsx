"use client";

import React, { useState, useEffect, useMemo } from "react";
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
  X,
  FileKey,
} from "lucide-react";

export type LoginCategory =
  | "Email Accounts"
  | "Client & Vendor Portals"
  | "Tax & Government"
  | "Banking & Payroll"
  | "General";

export interface LoginCredential {
  id: string;
  title: string;
  category: LoginCategory;
  username: string;
  password: string;
  url?: string;
  notes?: string;
  updatedAt: string;
}

const CATEGORIES: { label: LoginCategory; icon: React.ElementType }[] = [
  { label: "Email Accounts", icon: Mail },
  { label: "Client & Vendor Portals", icon: Building2 },
  { label: "Tax & Government", icon: Landmark },
  { label: "Banking & Payroll", icon: ShieldCheck },
  { label: "General", icon: Globe },
];

const INITIAL_LOGINS: LoginCredential[] = [
  {
    id: "cred-1",
    title: "Google Workspace Admin",
    category: "Email Accounts",
    username: "admin@ziptabs.com",
    password: "••••••••••••",
    url: "https://admin.google.com",
    notes: "Primary business email administration & user routing",
    updatedAt: "2026-10-28",
  },
  {
    id: "cred-2",
    title: "ADP Workforce Portal",
    category: "Banking & Payroll",
    username: "payroll.ziptabs",
    password: "••••••••••••",
    url: "https://workforcenow.adp.com",
    notes: "Semi-monthly payroll generation and direct deposit",
    updatedAt: "2026-10-20",
  },
  {
    id: "cred-3",
    title: "USCIS E-Verify Portal",
    category: "Tax & Government",
    username: "everify_admin",
    password: "••••••••••••",
    url: "https://www.e-verify.gov",
    notes: "I-9 employment verification for consultants",
    updatedAt: "2026-10-15",
  },
];

export function LoginsView() {
  const [logins, setLogins] = useState<LoginCredential[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    category: "Email Accounts" as LoginCategory,
    username: "",
    password: "",
    url: "",
    notes: "",
  });

  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("ziptabs_vault_credentials");
      if (stored) {
        setLogins(JSON.parse(stored));
      } else {
        setLogins(INITIAL_LOGINS);
        localStorage.setItem("ziptabs_vault_credentials", JSON.stringify(INITIAL_LOGINS));
      }
    } catch {
      setLogins(INITIAL_LOGINS);
    }
  }, []);

  // Save to localStorage
  const saveLogins = (newLogins: LoginCredential[]) => {
    setLogins(newLogins);
    try {
      localStorage.setItem("ziptabs_vault_credentials", JSON.stringify(newLogins));
    } catch (e) {
      console.error("Failed to save credentials", e);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey((prev) => (prev === key ? null : prev));
    }, 2000);
  };

  const togglePasswordVisibility = (id: string) => {
    setVisiblePasswords((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
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

  const handleOpenEditModal = (item: LoginCredential) => {
    setEditingId(item.id);
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

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this login record?")) {
      const updated = logins.filter((item) => item.id !== id);
      saveLogins(updated);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.username.trim()) return;

    if (editingId) {
      const updated = logins.map((item) =>
        item.id === editingId
          ? {
              ...item,
              ...formData,
              updatedAt: new Date().toISOString().split("T")[0],
            }
          : item
      );
      saveLogins(updated);
    } else {
      const newItem: LoginCredential = {
        id: `cred-${Date.now()}`,
        ...formData,
        updatedAt: new Date().toISOString().split("T")[0],
      };
      saveLogins([newItem, ...logins]);
    }

    setIsModalOpen(false);
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

  return (
    <div className="space-y-6 pb-16 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4 pb-4 sm:pb-6 border-b border-slate-200/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
              Logins & Portals
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-xl">
            Categorized directory of your email credentials, client portals, and state/tax logins.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Login</span>
          </button>
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
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  selectedCategory === cat.label ? "bg-slate-800 text-slate-200" : "bg-slate-100 text-slate-500"
                }`}>
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
      {filteredLogins.length === 0 ? (
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
                      <span className="text-slate-500 font-medium text-[11px]">Username / Email</span>
                      <button
                        onClick={() => copyToClipboard(item.username, `user-${item.id}`)}
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
                      <span className="text-slate-500 font-medium text-[11px]">Password</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => togglePasswordVisibility(item.id)}
                          className="text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                          title={isVisible ? "Hide password" : "Show password"}
                        >
                          {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => copyToClipboard(item.password, `pass-${item.id}`)}
                          className="flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
                        >
                          {copiedKey === `pass-${item.id}` ? (
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

      {/* Security Note Banner */}
      <div className="bg-slate-50 rounded-2xl border border-slate-200/80 p-4 sm:p-5 flex items-start gap-3.5">
        <Lock className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
            Local Device Storage
          </h4>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            All stored passwords and login credentials are held exclusively in your local browser sandbox storage. You can edit, copy, or remove them at any time.
          </p>
        </div>
      </div>

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
                <label className="block font-semibold text-slate-700 mb-1">
                  Category *
                </label>
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
                  Password / PIN
                </label>
                <input
                  type="text"
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
                  Notes & 2FA Hints (optional)
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
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold cursor-pointer shadow-xs"
                >
                  {editingId ? "Save Changes" : "Save Login"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}