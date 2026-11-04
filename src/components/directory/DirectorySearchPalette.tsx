"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import { DirectoryRecord } from "@/lib/directoryCrypto";
import {
  Search,
  X,
  Phone,
  Mail,
  Building2,
  User,
  Users,
  Copy,
  Check,
  ExternalLink,
  CornerDownLeft,
  ArrowUpDown,
  Sparkles,
} from "lucide-react";

interface DirectorySearchPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  records: DirectoryRecord[];
  onSelectRecord?: (record: DirectoryRecord) => void;
  onSearchFilter?: (query: string, record?: DirectoryRecord) => void;
}

export function DirectorySearchPalette({
  isOpen,
  onClose,
  records,
  onSelectRecord,
  onSearchFilter,
}: DirectorySearchPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedField, setCopiedField] = useState<{ id: string; type: "phone" | "email" } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Focus input whenever opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  // Handle escape & arrow keys
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Filtered search across BOTH divisions
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      // If empty query, show first 10 recent contacts
      return {
        employees: records.filter((r) => r.division === "employee").slice(0, 5),
        vendors: records.filter((r) => r.division === "vendor").slice(0, 5),
        totalMatches: Math.min(records.length, 10),
      };
    }

    const cleanNum = q.replace(/\D/g, "");

    const matches = (r: DirectoryRecord) => {
      const nameMatch = r.name.toLowerCase().includes(q);
      const compMatch = r.company.toLowerCase().includes(q);
      const emailMatch = r.email.toLowerCase().includes(q);
      const notesMatch = r.notes ? r.notes.toLowerCase().includes(q) : false;
      const phoneMatch =
        r.phone.toLowerCase().includes(q) ||
        (cleanNum.length >= 3 && r.phone.replace(/\D/g, "").includes(cleanNum));

      return nameMatch || compMatch || emailMatch || notesMatch || phoneMatch;
    };

    const matchedEmployees = records.filter((r) => r.division === "employee" && matches(r));
    const matchedVendors = records.filter((r) => r.division === "vendor" && matches(r));

    return {
      employees: matchedEmployees,
      vendors: matchedVendors,
      totalMatches: matchedEmployees.length + matchedVendors.length,
    };
  }, [query, records]);

  // Flattened list for keyboard selection
  const flatList = useMemo(() => {
    return [...searchResults.employees, ...searchResults.vendors];
  }, [searchResults]);

  // Keep selected index in bound
  useEffect(() => {
    if (selectedIndex >= flatList.length) {
      setSelectedIndex(Math.max(0, flatList.length - 1));
    }
  }, [flatList.length, selectedIndex]);

  const handleKeyDownList = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < flatList.length ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const rec = flatList[selectedIndex] || flatList[0];
      const filterTerm = query.trim() || (rec ? rec.name : "");
      if (onSearchFilter && filterTerm) {
        onSearchFilter(filterTerm, rec);
        onClose();
      } else if (rec) {
        if (onSelectRecord) {
          onSelectRecord(rec);
        }
        onClose();
      }
    }
  };

  const copyToClipboard = (text: string, id: string, type: "phone" | "email") => {
    navigator.clipboard.writeText(text);
    setCopiedField({ id, type });
    setTimeout(() => {
      setCopiedField((curr) => (curr?.id === id && curr?.type === type ? null : curr));
    }, 1800);
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-1.5 sm:pt-16 px-2 sm:px-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100dvh-0.75rem)] sm:max-h-[calc(100dvh-4rem)] my-0 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDownList}
      >
        {/* Command Search Header */}
        <div className="flex items-center px-3 sm:px-4 py-3 sm:py-3.5 border-b border-slate-100 bg-slate-50/70">
          <Search className="w-5 h-5 text-blue-600 shrink-0 mr-2.5 sm:mr-3" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDownList}
            placeholder="Search across Employees & Vendors (name, company, phone, email)..."
            className="w-full text-sm sm:text-base bg-transparent text-slate-800 placeholder-slate-400 focus:outline-none"
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                inputRef.current?.focus();
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-semibold text-slate-400 bg-slate-200/70 rounded border border-slate-300/50">
              ESC
            </span>
          )}
        </div>

        {/* Division Search Summary & Hotkey Info */}
        <div className="px-3 sm:px-4 py-2 bg-blue-50/70 border-b border-blue-100/80 flex items-center justify-between text-xs text-blue-900 gap-2">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
            <span className="font-semibold text-[11px] sm:text-xs">Results:</span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100/90 text-blue-800 text-[10px] sm:text-[11px] font-semibold">
              <Users className="w-3 h-3" />
              {searchResults.employees.length} Employees
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100/90 text-indigo-800 text-[10px] sm:text-[11px] font-semibold">
              <Building2 className="w-3 h-3" />
              {searchResults.vendors.length} Vendors
            </span>
          </div>
          {query.trim() && (
            <button
              type="button"
              onClick={() => {
                const rec = flatList[0];
                const filterTerm = query.trim() || (rec ? rec.name : "");
                if (onSearchFilter && filterTerm) {
                  onSearchFilter(filterTerm, rec);
                } else if (rec && onSelectRecord) {
                  onSelectRecord(rec);
                }
                onClose();
              }}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-[10px] sm:text-xs flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs active:scale-95"
            >
              <span>Filter View</span>
              <CornerDownLeft className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Results List */}
        <div
          ref={resultsContainerRef}
          className="flex-1 min-h-0 overflow-y-auto p-2 space-y-3 max-h-[48vh] sm:max-h-[60vh] scrollbar-thin scrollbar-thumb-slate-200 overscroll-contain"
        >
          {searchResults.totalMatches === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <Search className="w-8 h-8 mx-auto text-slate-300 mb-2 stroke-1" />
              <p className="font-medium text-sm text-slate-700">No contacts found</p>
              <p className="text-xs text-slate-400 mt-1">
                No matching employee or vendor found for &ldquo;{query}&rdquo;
              </p>
            </div>
          ) : (
            <>
              {/* EMPLOYEES SECTION */}
              {searchResults.employees.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-blue-600" />
                    Employees ({searchResults.employees.length})
                  </div>
                  <div className="space-y-1 mt-1">
                    {searchResults.employees.map((rec) => {
                      const itemIndex = flatList.indexOf(rec);
                      const isSelected = itemIndex === selectedIndex;
                      return (
                        <SearchContactRow
                          key={rec.id}
                          record={rec}
                          isSelected={isSelected}
                          copiedField={copiedField}
                          onCopy={copyToClipboard}
                          onSelect={() => {
                            const filterTerm = query.trim() || rec.name;
                            if (onSearchFilter && filterTerm) {
                              onSearchFilter(filterTerm, rec);
                            } else if (onSelectRecord) {
                              onSelectRecord(rec);
                            }
                            onClose();
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* VENDORS SECTION */}
              {searchResults.vendors.length > 0 && (
                <div>
                  <div className="px-3 py-1 text-[11px] font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    Vendors ({searchResults.vendors.length})
                  </div>
                  <div className="space-y-1 mt-1">
                    {searchResults.vendors.map((rec) => {
                      const itemIndex = flatList.indexOf(rec);
                      const isSelected = itemIndex === selectedIndex;
                      return (
                        <SearchContactRow
                          key={rec.id}
                          record={rec}
                          isSelected={isSelected}
                          copiedField={copiedField}
                          onCopy={copyToClipboard}
                          onSelect={() => {
                            const filterTerm = query.trim() || rec.name;
                            if (onSearchFilter && filterTerm) {
                              onSearchFilter(filterTerm, rec);
                            } else if (onSelectRecord) {
                              onSelectRecord(rec);
                            }
                            onClose();
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-2xs font-sans text-[10px]">Ctrl</kbd>
              <kbd className="px-1.5 py-0.5 bg-white border border-slate-200 rounded shadow-2xs font-sans text-[10px]">K</kbd>
              <span className="text-slate-400 ml-1">Phone Directory Search</span>
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Showing {searchResults.totalMatches} contacts
          </span>
        </div>
      </div>
    </div>,
    document.body
  );
}

function SearchContactRow({
  record,
  isSelected,
  copiedField,
  onCopy,
  onSelect,
}: {
  record: DirectoryRecord;
  isSelected: boolean;
  copiedField: { id: string; type: "phone" | "email" } | null;
  onCopy: (text: string, id: string, type: "phone" | "email") => void;
  onSelect: () => void;
}) {
  const isEmployee = record.division === "employee";

  // Initials for avatar
  const initials = record.name
    ? record.name
        .split(" ")
        .map((p) => p[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "??";

  return (
    <div
      onClick={onSelect}
      className={`group flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
        isSelected
          ? isEmployee
            ? "bg-blue-50/90 border-blue-300 ring-2 ring-blue-500/20 shadow-xs"
            : "bg-indigo-50/90 border-indigo-300 ring-2 ring-indigo-500/20 shadow-xs"
          : "bg-white border-slate-100 hover:bg-slate-50/80 hover:border-slate-200"
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Avatar */}
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-xs ${
            isEmployee
              ? "bg-blue-600 text-white"
              : "bg-indigo-600 text-white"
          }`}
        >
          {initials}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-xs sm:text-sm font-semibold text-slate-900 truncate">
              {record.name}
            </p>
            <span
              className={`px-1.5 py-0.5 text-[10px] font-semibold rounded-md border shrink-0 ${
                isEmployee
                  ? "bg-blue-50 text-blue-700 border-blue-200"
                  : "bg-indigo-50 text-indigo-700 border-indigo-200"
              }`}
            >
              {isEmployee ? "Employee" : "Vendor"}
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 truncate">
            <span className="font-medium text-slate-700 truncate">
              {record.company}
            </span>
            {record.notes && (
              <>
                <span className="text-slate-300">•</span>
                <span className="text-slate-400 truncate text-[11px]">
                  {record.notes}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons: Phone & Email Copy Only */}
      <div className="flex items-center gap-1.5 shrink-0 ml-3" onClick={(e) => e.stopPropagation()}>
        {record.phone && (
          <div className="flex items-center bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 shadow-2xs">
            <span className="hidden sm:inline text-xs font-mono font-medium text-slate-700 mr-1">
              {record.phone}
            </span>
            <button
              type="button"
              onClick={() => onCopy(record.phone, record.id, "phone")}
              title="Copy Phone Number"
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              {copiedField?.id === record.id && copiedField?.type === "phone" ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}

        {record.email && (
          <div className="hidden md:flex items-center bg-white border border-slate-200 rounded-lg px-1.5 py-0.5 shadow-2xs">
            <span className="text-xs text-slate-600 mr-1 truncate max-w-[140px]">
              {record.email}
            </span>
            <button
              type="button"
              onClick={() => onCopy(record.email, record.id, "email")}
              title="Copy Email Address"
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
            >
              {copiedField?.id === record.id && copiedField?.type === "email" ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
