"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { DirectoryRecord, formatUSAPhone, formatAsYouTypeUSAPhone } from "@/lib/directoryCrypto";
import {
  User,
  Building2,
  Phone,
  PhoneForwarded,
  Mail,
  FileText,
  X,
  Lock,
  Save,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Loader2,
  Plus,
  ChevronDown,
  Check,
  Search,
  Sparkles,
} from "lucide-react";

interface CompanySuggestion {
  company: string;
  count: number;
}

interface DirectoryContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (record: {
    id?: string;
    division: "employee" | "vendor";
    company: string;
    name: string;
    email: string;
    phone: string;
    extension?: string;
    notes?: string;
  }) => Promise<void>;
  initialRecord?: DirectoryRecord | null;
  defaultDivision?: "employee" | "vendor";
  isDivisionLocked?: boolean;
  existingCompanies?: CompanySuggestion[];
  existingRecords?: DirectoryRecord[];
}

export function DirectoryContactModal({
  isOpen,
  onClose,
  onSave,
  initialRecord,
  defaultDivision = "employee",
  isDivisionLocked = false,
  existingCompanies = [],
  existingRecords = [],
}: DirectoryContactModalProps) {
  const [ackDuplicate, setAckDuplicate] = useState(false);
  const [division, setDivision] = useState<"employee" | "vendor">(defaultDivision);
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [extension, setExtension] = useState("");
  const [showExtension, setShowExtension] = useState(false);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Company Combobox & Autocomplete state
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const [isNewCompanyInputActive, setIsNewCompanyInputActive] = useState(false);
  const companyContainerRef = useRef<HTMLDivElement>(null);
  const companyInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialRecord) {
      setDivision(initialRecord.division);
      setCompany(initialRecord.company || "");
      setName(initialRecord.name || "");
      setEmail(initialRecord.email || "");
      setPhone(formatUSAPhone(initialRecord.phone || "", false));
      const ext = initialRecord.extension || "";
      setExtension(ext);
      setShowExtension(Boolean(ext));
      setNotes(initialRecord.notes || "");
    } else {
      setDivision(defaultDivision);
      setCompany("");
      setName("");
      setEmail("");
      setPhone("");
      setExtension("");
      setShowExtension(false);
      setNotes("");
    }
    setError(null);
    setIsCompanyDropdownOpen(false);
    setIsNewCompanyInputActive(false);
  }, [initialRecord, defaultDivision, isOpen]);

  // Close company dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        companyContainerRef.current &&
        !companyContainerRef.current.contains(e.target as Node)
      ) {
        setIsCompanyDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Filter company suggestions based on typed input
  const filteredCompanySuggestions = useMemo(() => {
    const q = company.trim().toLowerCase();
    if (!q) {
      return existingCompanies.slice(0, 10);
    }
    return existingCompanies.filter((c) =>
      c.company.toLowerCase().includes(q)
    );
  }, [company, existingCompanies]);

  const hasExactCompanyMatch = useMemo(() => {
    const q = company.trim().toLowerCase();
    if (!q) return false;
    return existingCompanies.some((c) => c.company.toLowerCase() === q);
  }, [company, existingCompanies]);

  const isEditMode = Boolean(initialRecord);
  const shouldLockDivision = isEditMode || isDivisionLocked;

  // Live duplicate phone number detection across directory records
  const duplicatePhoneRecord = useMemo(() => {
    if (!existingRecords || existingRecords.length === 0 || !phone.trim()) return null;
    const cleanNew = phone.replace(/\D/g, "");
    const normNew = cleanNew.length === 11 && cleanNew.startsWith("1") ? cleanNew.slice(1) : cleanNew;
    if (normNew.length < 7) return null;

    return (
      existingRecords.find((r) => {
        if (initialRecord && r.id === initialRecord.id) return false;
        const cleanExisting = (r.phone || "").replace(/\D/g, "");
        const normExisting =
          cleanExisting.length === 11 && cleanExisting.startsWith("1")
            ? cleanExisting.slice(1)
            : cleanExisting;
        return normExisting.length >= 7 && normExisting === normNew;
      }) || null
    );
  }, [existingRecords, phone, initialRecord]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter the contact's name.");
      return;
    }

    if (!phone.trim() && !email.trim()) {
      setError("Please provide at least a phone number or email address.");
      return;
    }

    // Warn about duplicate phone number before saving
    if (duplicatePhoneRecord && !ackDuplicate) {
      setAckDuplicate(true);
      setError(
        `⚠️ Duplicate Number Warning: ${formatUSAPhone(phone, false)} is already registered to ${duplicatePhoneRecord.name} at ${duplicatePhoneRecord.company} (${duplicatePhoneRecord.division === "vendor" ? "Vendor" : "Employee"}). If you are certain you want to save this duplicate, click "Save Contact" once more to confirm.`
      );
      return;
    }

    setIsSaving(true);
    try {
      await onSave({
        id: initialRecord?.id,
        division,
        company: company.trim() || (division === "employee" ? "ZipTabs Corp" : "Vendor Partner"),
        name: name.trim(),
        email: email.trim(),
        phone: formatUSAPhone(phone, false),
        extension: showExtension && extension.trim() ? extension.trim() : undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || "Failed to save contact. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSelectCompany = (selectedName: string) => {
    setCompany(selectedName);
    setIsCompanyDropdownOpen(false);
    setIsNewCompanyInputActive(false);
  };

  const handleAddNewCompanyOption = () => {
    setIsNewCompanyInputActive(true);
    setIsCompanyDropdownOpen(false);
    setTimeout(() => {
      companyInputRef.current?.focus();
    }, 50);
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto overscroll-contain animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100dvh-4rem)] sm:max-h-[85vh] my-auto animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header (Pinned) */}
        <div className="px-5 py-3.5 sm:py-4 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-xs ${
                division === "employee" ? "bg-blue-600" : "bg-indigo-600"
              }`}
            >
              {division === "employee" ? (
                <User className="w-5 h-5" />
              ) : (
                <Building2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                {isEditMode
                  ? division === "employee"
                    ? "Edit Employee Contact"
                    : "Edit Vendor Contact"
                  : division === "employee"
                  ? "Add New Employee"
                  : "Add New Vendor"}
              </h3>
              <p className="text-xs text-slate-500">
                Encrypted with AES-256-GCM &amp; Salted SHA-256 in Supabase
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form with Scrollable Body and Pinned Action Footer */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Scrollable Fields Body */}
          <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 overscroll-contain">
            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </div>
            )}

          {/* Division Indicator / Lock */}
          <div>
            {shouldLockDivision ? (
              /* Division is strictly fixed for this division: NO toggle tab shown */
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Division:
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold border ${
                      division === "employee"
                        ? "bg-blue-50 text-blue-700 border-blue-200 shadow-2xs"
                        : "bg-indigo-50 text-indigo-700 border-indigo-200 shadow-2xs"
                    }`}
                  >
                    {division === "employee" ? (
                      <User className="w-3.5 h-3.5 text-blue-600" />
                    ) : (
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    )}
                    {division === "employee" ? "Employee Record" : "Vendor Record"}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
                  {isEditMode ? "Division is locked" : "Isolated division"}
                </span>
              </div>
            ) : (
              /* Only shown if explicitly adding from 'All' view with unlocked division */
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Select Division
                </label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setDivision("employee")}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      division === "employee"
                        ? "bg-white text-blue-700 shadow-xs border border-blue-200/60"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <User className="w-4 h-4" />
                    Employee
                  </button>
                  <button
                    type="button"
                    onClick={() => setDivision("vendor")}
                    className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      division === "vendor"
                        ? "bg-white text-indigo-700 shadow-xs border border-indigo-200/60"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    <Building2 className="w-4 h-4" />
                    Vendor
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Company & Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Company with Combobox / Suggestion Dropdown */}
            <div ref={companyContainerRef} className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Company {division === "vendor" ? <span className="text-slate-500 font-normal">(Vendor Name)</span> : <span className="text-slate-400 font-normal">(Optional)</span>}
                </label>
                {existingCompanies.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsCompanyDropdownOpen((prev) => !prev)}
                    className="text-[10px] font-semibold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    {isCompanyDropdownOpen ? "Close list" : "Existing list"}
                  </button>
                )}
              </div>

              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 z-10" />
                <input
                  ref={companyInputRef}
                  type="text"
                  value={company}
                  onFocus={() => {
                    if (existingCompanies.length > 0) {
                      setIsCompanyDropdownOpen(true);
                    }
                  }}
                  onChange={(e) => {
                    setCompany(e.target.value);
                    if (existingCompanies.length > 0) {
                      setIsCompanyDropdownOpen(true);
                    }
                  }}
                  placeholder={
                    division === "vendor"
                      ? "e.g. Penske Truck Leasing"
                      : "e.g. ZipTabs Corp"
                  }
                  className="w-full pl-9 pr-8 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
                />
                {existingCompanies.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsCompanyDropdownOpen((prev) => !prev)}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <ChevronDown
                      className={`w-4 h-4 transition-transform ${
                        isCompanyDropdownOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                )}
              </div>

              {/* Autocomplete / Existing Companies Dropdown */}
              {isCompanyDropdownOpen && existingCompanies.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-30 overflow-hidden max-h-56 overflow-y-auto animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Existing {division === "vendor" ? "Vendors" : "Companies"}</span>
                    <span>{existingCompanies.length} registered</span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {filteredCompanySuggestions.map((item) => {
                      const isSelected = company.trim().toLowerCase() === item.company.toLowerCase();
                      return (
                        <button
                          key={item.company}
                          type="button"
                          onClick={() => handleSelectCompany(item.company)}
                          className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs hover:bg-blue-50/80 transition-colors cursor-pointer ${
                            isSelected ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-800"
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <Building2 className={`w-3.5 h-3.5 shrink-0 ${isSelected ? "text-blue-600" : "text-slate-400"}`} />
                            <span className="truncate">{item.company}</span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-500">
                              {item.count} {item.count === 1 ? "contact" : "contacts"}
                            </span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />}
                          </div>
                        </button>
                      );
                    })}

                    {/* Option to create a new company */}
                    <button
                      type="button"
                      onClick={handleAddNewCompanyOption}
                      className="w-full px-3 py-2 text-left flex items-center gap-2 text-xs font-semibold text-blue-600 bg-blue-50/40 hover:bg-blue-100/60 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">
                        {company.trim() && !hasExactCompanyMatch
                          ? `Use new company: "${company.trim()}"`
                          : "+ Add a New Company"}
                      </span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
                />
              </div>
            </div>
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Phone Number
                </label>
                {/* Extension Toggle Button (By default OFF) */}
                <button
                  type="button"
                  onClick={() => {
                    if (showExtension) {
                      setShowExtension(false);
                      setExtension("");
                    } else {
                      setShowExtension(true);
                    }
                  }}
                  className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer select-none active:scale-95 ${
                    showExtension
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-slate-100 text-slate-500 hover:bg-slate-200 border border-slate-200/90"
                  }`}
                  title={showExtension ? "Hide Extension field" : "Enable Extension field"}
                >
                  <span>Extension</span>
                  <span
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      showExtension ? "bg-white animate-pulse" : "bg-slate-400"
                    }`}
                  />
                </button>
              </div>

              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(formatAsYouTypeUSAPhone(e.target.value));
                    setAckDuplicate(false);
                  }}
                  placeholder="1 (555) 000-0000"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white font-mono"
                />
              </div>
              {duplicatePhoneRecord && (
                <div className="mt-2 p-2.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-start gap-2 animate-in fade-in slide-in-from-top-1 shadow-2xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-bold text-amber-800 text-[11px] uppercase tracking-wider">
                      Duplicate Phone Detected
                    </p>
                    <p className="text-amber-700 text-xs mt-0.5">
                      Already registered to <strong className="font-bold text-amber-950 underline decoration-amber-400">{duplicatePhoneRecord.name}</strong> at <strong className="font-bold text-amber-950">{duplicatePhoneRecord.company}</strong> ({duplicatePhoneRecord.division === "vendor" ? "Vendor" : "Employee"}).
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="contact@company.com"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white"
                />
              </div>
            </div>
          </div>

          {/* Extension field placed in a dedicated new line when enabled so phone number remains 100% visible */}
          {showExtension && (
            <div className="animate-in fade-in slide-in-from-top-1 duration-150 p-2.5 bg-blue-50/50 rounded-xl border border-blue-100">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                  <PhoneForwarded className="w-3.5 h-3.5 text-blue-600" />
                  <span>Phone Extension Number</span>
                </label>
                <span className="text-[10px] text-blue-500 font-mono">Displayed as superscript with phone</span>
              </div>
              <div className="relative w-full sm:w-1/2">
                <PhoneForwarded className="w-4 h-4 text-blue-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={extension}
                  onChange={(e) => setExtension(e.target.value.replace(/[^\d\w-]/g, ""))}
                  placeholder="e.g. 204 or 416"
                  className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm rounded-xl border border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white text-blue-900 font-mono font-bold"
                  title="Phone Extension Number (e.g. 204)"
                />
              </div>
            </div>
          )}

          {/* Notes / Department / Title (Bigger Text Area) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
              <span>Title / Notes <span className="text-slate-400 font-normal">(Optional)</span></span>
              <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-0.5">
                <Lock className="w-2.5 h-2.5" />
                Hashed &amp; Salted
              </span>
            </label>
            <div className="relative">
              <FileText className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Senior Dispatcher / Direct Support / Delivery Instructions"
                className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all bg-white resize-y min-h-[88px] leading-relaxed"
              />
            </div>
          </div>

          {/* Cryptography notice */}
          <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200/80 flex items-center gap-2.5 text-emerald-900 text-[11px]">
            <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              All fields (Phone, Email, Notes, Company, Name) are securely salted, hashed (SHA-256), and encrypted (AES-256-GCM) before saving to Supabase.
            </span>
          </div>
        </div>

        {/* Pinned Action Footer (Always visible, never cut off on mobile) */}
        <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/80 flex items-center justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-98 rounded-xl shadow-md shadow-blue-500/20 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Encrypting &amp; Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                {isEditMode ? "Update Record" : "Save Record"}
              </>
            )}
          </button>
        </div>
      </form>
      </div>
    </div>,
    document.body
  );
}
