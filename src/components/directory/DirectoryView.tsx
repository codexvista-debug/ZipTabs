"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { supabase } from "@/lib/supabase";
import {
  DirectoryRecord,
  RawSupabaseDirectoryRow,
  getDirectoryKey,
  encryptDirectoryRecordForDb,
  decryptSupabaseDirectoryRow,
} from "@/lib/directoryCrypto";
import {
  DirectorySearchPalette,
} from "./DirectorySearchPalette";
import {
  DirectoryContactModal,
} from "./DirectoryContactModal";
import {
  DirectorySecurityModal,
} from "./DirectorySecurityModal";
import { ParsedSpreadsheetContact } from "@/lib/directoryExcel";
import {
  ExecutiveToast,
  getToastPosition,
  ToastPosition,
} from "@/components/ui/ExecutiveToast";
import {
  Phone,
  PhoneCall,
  Mail,
  Building2,
  User,
  Users,
  Search,
  Plus,
  ShieldCheck,
  Lock,
  Edit2,
  Trash2,
  Copy,
  Check,
  X,
  ExternalLink,
  Sparkles,
  Filter,
  ArrowUpDown,
  BookUser,
  SlidersHorizontal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Info,
  CheckCircle2,
  AlertCircle,
  Hash,
  Database,
  Eye,
  FileText,
  Loader2,
  Globe,
} from "lucide-react";

export function DirectoryView() {
  const [records, setRecords] = useState<DirectoryRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeDivision, setActiveDivision] = useState<"employee" | "vendor" | "all">("vendor");
  const [activeSearchFilter, setActiveSearchFilter] = useState<string>("");

  // Selection & quick actions
  const [copiedField, setCopiedField] = useState<{ id: string; type: "phone" | "email" } | null>(null);
  const [focusedRecordId, setFocusedRecordId] = useState<string | null>(null);

  // Modals
  const [isSearchPaletteOpen, setIsSearchPaletteOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DirectoryRecord | null>(null);
  const [isSecurityModalOpen, setIsSecurityModalOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState<DirectoryRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Toast
  const [toast, setToast] = useState<{
    type?: "success" | "error" | "warning" | "info";
    title: string;
    description?: string;
    metric?: string;
  } | null>(null);

  // Ctrl + K Global Hotkey Handler (Scoped to this Directory tab)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchPaletteOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Fetch and decrypt all directory records from Supabase
  const fetchDirectory = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!supabase) {
        console.warn("Supabase not available");
        setIsLoading(false);
        return;
      }

      const key = await getDirectoryKey();

      const { data, error } = await supabase
        .from("phone_directory")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching phone directory:", error);
        setToast({
          type: "error",
          title: "Directory Load Error",
          description: error.message,
        });
        setIsLoading(false);
        return;
      }

      if (data && data.length > 0) {
        // Decrypt all rows in memory
        const decryptedList: DirectoryRecord[] = [];
        for (const rawRow of data as RawSupabaseDirectoryRow[]) {
          try {
            const dec = await decryptSupabaseDirectoryRow(rawRow, key);
            decryptedList.push(dec);
          } catch (decErr) {
            console.warn("Could not decrypt directory row:", rawRow.id, decErr);
          }
        }
        setRecords(decryptedList);

        // Quietly upgrade any unformatted legacy phone records in Supabase in the background
        const recordsToUpgrade = decryptedList.filter((r) => r._phoneNeedsUpgrade);
        if (recordsToUpgrade.length > 0 && supabase) {
          (async () => {
            for (const r of recordsToUpgrade) {
              try {
                const payload = await encryptDirectoryRecordForDb(r, key);
                await supabase.from("phone_directory").update(payload).eq("id", r.id);
              } catch (upgradeErr) {
                console.debug("Silent phone upgrade skipped for", r.id, upgradeErr);
              }
            }
          })();
        }
      } else {
        setRecords([]);
      }
    } catch (err: any) {
      console.error("Failed to load directory:", err);
      setToast({
        type: "error",
        title: "Decryption Failed",
        description: err?.message || "Could not derive cryptographic key.",
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDirectory();
  }, [fetchDirectory]);

  // Real-time synchronization via Supabase postgres_changes
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel("phone_directory_realtime_sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "phone_directory",
        },
        async (payload) => {
          if (payload.eventType === "DELETE") {
            const deletedId = (payload.old as any)?.id;
            if (deletedId) {
              setRecords((prev) => prev.filter((r) => r.id !== deletedId));
            }
          } else if (payload.eventType === "INSERT") {
            const newRow = payload.new as RawSupabaseDirectoryRow;
            try {
              const key = await getDirectoryKey();
              const dec = await decryptSupabaseDirectoryRow(newRow, key);
              setRecords((prev) => {
                if (prev.some((r) => r.id === dec.id)) return prev;
                return [dec, ...prev];
              });
            } catch (err) {
              console.warn("Could not decrypt realtime inserted row:", err);
            }
          } else if (payload.eventType === "UPDATE") {
            const updatedRow = payload.new as RawSupabaseDirectoryRow;
            try {
              const key = await getDirectoryKey();
              const dec = await decryptSupabaseDirectoryRow(updatedRow, key);
              setRecords((prev) =>
                prev.map((r) => (r.id === dec.id ? dec : r))
              );
            } catch (err) {
              console.warn("Could not decrypt realtime updated row:", err);
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, []);

  // Copy to clipboard helper with checkmark animation
  const copyToClipboard = (text: string, id: string, type: "phone" | "email") => {
    navigator.clipboard.writeText(text);
    setCopiedField({ id, type });
    setToast({
      type: "success",
      title: type === "phone" ? "Phone Number Copied" : "Email Address Copied",
      description: text,
      metric: "Clipboard",
    });
    setTimeout(() => {
      setCopiedField((curr) => (curr?.id === id && curr?.type === type ? null : curr));
    }, 2000);
  };

  // Save or update contact
  const handleSaveContact = async (data: {
    id?: string;
    division: "employee" | "vendor";
    company: string;
    name: string;
    email: string;
    phone: string;
    extension?: string;
    notes?: string;
  }) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const key = await getDirectoryKey();

    const dbPayload = await encryptDirectoryRecordForDb(data, key);

    if (data.id) {
      // Update
      const { error } = await supabase
        .from("phone_directory")
        .update({
          ...dbPayload,
          updated_at: new Date().toISOString(),
        })
        .eq("id", data.id);

      if (error) throw error;

      setRecords((prev) =>
        prev.map((r) =>
          r.id === data.id
            ? {
                ...r,
                division: data.division,
                company: data.company,
                name: data.name,
                email: data.email,
                phone: data.phone,
                extension: data.extension,
                notes: data.notes,
                updated_at: new Date().toISOString(),
              }
            : r
        )
      );

      setToast({
        type: "success",
        title: "Contact Updated",
        description: `${data.name} was successfully encrypted & updated in Supabase.`,
      });
    } else {
      // Insert
      const { data: inserted, error } = await supabase
        .from("phone_directory")
        .insert(dbPayload)
        .select()
        .single();

      if (error) throw error;

      const newRecord: DirectoryRecord = {
        id: inserted.id,
        division: data.division,
        company: data.company,
        name: data.name,
        email: data.email,
        phone: data.phone,
        extension: data.extension,
        notes: data.notes,
        created_at: inserted.created_at,
        updated_at: inserted.updated_at,
      };

      setRecords((prev) => [newRecord, ...prev]);

      setToast({
        type: "success",
        title: "Contact Created & Encrypted",
        description: `${data.name} was saved with SHA-256 hashes and AES-256-GCM encryption.`,
      });
    }
  };

  // Delete contact
  const confirmDeleteRecord = async () => {
    if (!recordToDelete || !supabase) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from("phone_directory")
        .delete()
        .eq("id", recordToDelete.id);

      if (error) throw error;

      setRecords((prev) => prev.filter((r) => r.id !== recordToDelete.id));
      setToast({
        type: "warning",
        title: "Contact Removed",
        description: `${recordToDelete.name} was deleted from Supabase.`,
      });
      setRecordToDelete(null);
    } catch (err: any) {
      setToast({
        type: "error",
        title: "Delete Failed",
        description: err?.message || "Could not delete contact.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // Batch Import from Excel / CSV
  const handleImportSpreadsheet = async (
    parsedItems: ParsedSpreadsheetContact[],
    divisionChoice: "employee" | "vendor" | "auto"
  ) => {
    if (!supabase) throw new Error("Supabase is not configured.");
    const key = await getDirectoryKey();

    const dbRows: any[] = [];
    for (const item of parsedItems) {
      const targetDiv =
        divisionChoice === "auto" ? item.division || "employee" : divisionChoice;

      const dbPayload = await encryptDirectoryRecordForDb(
        {
          division: targetDiv,
          company: item.company || "Corporate",
          name: item.name || "Contact",
          email: item.email || "",
          phone: item.phone || "",
          notes: item.notes,
        },
        key
      );
      dbRows.push(dbPayload);
    }

    // Insert in batches of 50
    const batchSize = 50;
    for (let i = 0; i < dbRows.length; i += batchSize) {
      const batch = dbRows.slice(i, i + batchSize);
      const { error } = await supabase.from("phone_directory").insert(batch);
      if (error) throw error;
    }

    setToast({
      type: "success",
      title: "Excel Import Complete",
      description: `Successfully encrypted and stored ${parsedItems.length} contacts in Supabase.`,
      metric: `${parsedItems.length} Records`,
    });

    // Refresh view
    await fetchDirectory();
  };

  // Seed sample demo data if user wants to preview
  const handleLoadSampleData = async () => {
    const demoEmployees: ParsedSpreadsheetContact[] = [
      {
        division: "employee",
        company: "ZipTabs Corp",
        name: "Chief Executive Officer",
        email: "chief@ziptabs.com",
        phone: "1 (555) 100-2000",
        notes: "Executive Suite - Ext 100",
        raw: {},
      },
      {
        division: "employee",
        company: "ZipTabs Corp",
        name: "Sarah Jenkins",
        email: "sjenkins@ziptabs.com",
        phone: "1 (555) 392-8192",
        notes: "Operations & Fleet Director - Ext 104",
        raw: {},
      },
      {
        division: "employee",
        company: "ZipTabs Corp",
        name: "David Miller",
        email: "dmiller@ziptabs.com",
        phone: "1 (555) 748-2194",
        notes: "Senior Dispatcher - Ext 208",
        raw: {},
      },
      {
        division: "employee",
        company: "ZipTabs Corp",
        name: "Rachel Hayes",
        email: "rhayes@ziptabs.com",
        phone: "1 (555) 240-3918",
        notes: "Accounting & AP Specialist - Ext 312",
        raw: {},
      },
    ];

    const demoVendors: ParsedSpreadsheetContact[] = [
      {
        division: "vendor",
        company: "Penske Truck Leasing",
        name: "Marcus Vance",
        email: "mvance@penske.com",
        phone: "1 (800) 526-0798",
        notes: "National Fleet Account Executive",
        raw: {},
      },
      {
        division: "vendor",
        company: "Pilot Flying J Fuel Services",
        name: "Commercial Dispatch Desk",
        email: "fleetbilling@pilotflyingj.com",
        phone: "1 (877) 866-7378",
        notes: "24/7 Priority Fleet Desk",
        raw: {},
      },
      {
        division: "vendor",
        company: "QuickBooks Enterprise Support",
        name: "Enterprise Billing Desk",
        email: "support@intuit.com",
        phone: "1 (800) 446-8848",
        notes: "Corporate Account Rep",
        raw: {},
      },
      {
        division: "vendor",
        company: "Leopard TMS Solutions",
        name: "Dispatch Help Desk",
        email: "support@leopardtms.com",
        phone: "1 (888) 920-4100",
        notes: "Logistics TMS Integration Support",
        raw: {},
      },
    ];

    await handleImportSpreadsheet([...demoEmployees, ...demoVendors], "auto");
  };

  // Statistics
  const employeeCount = useMemo(
    () => records.filter((r) => r.division === "employee").length,
    [records]
  );
  const vendorCount = useMemo(
    () => records.filter((r) => r.division === "vendor").length,
    [records]
  );
  const totalCount = records.length;

  // Vendor company list with usage counts (for autocomplete suggestions)
  const vendorCompanies = useMemo(() => {
    const map = new Map<string, number>();
    records
      .filter((r) => r.division === "vendor")
      .forEach((r) => {
        if (r.company && r.company.trim()) {
          const comp = r.company.trim();
          map.set(comp, (map.get(comp) || 0) + 1);
        }
      });
    return Array.from(map.entries())
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count || a.company.localeCompare(b.company));
  }, [records]);

  // Employee company list with usage counts (for autocomplete suggestions)
  const employeeCompanies = useMemo(() => {
    const map = new Map<string, number>();
    records
      .filter((r) => r.division === "employee")
      .forEach((r) => {
        if (r.company && r.company.trim()) {
          const comp = r.company.trim();
          map.set(comp, (map.get(comp) || 0) + 1);
        }
      });
    return Array.from(map.entries())
      .map(([company, count]) => ({ company, count }))
      .sort((a, b) => b.count - a.count || a.company.localeCompare(b.company));
  }, [records]);

  // Filtered and Sorted Records (Vendor, Employee, All + Search Filter)
  const filteredRecords = useMemo(() => {
    return records
      .filter((r) => {
        if (activeSearchFilter) {
          const q = activeSearchFilter.toLowerCase();
          const cleanNum = q.replace(/\D/g, "");
          const nameMatch = r.name.toLowerCase().includes(q);
          const compMatch = r.company.toLowerCase().includes(q);
          const emailMatch = r.email ? r.email.toLowerCase().includes(q) : false;
          const notesMatch = r.notes ? r.notes.toLowerCase().includes(q) : false;
          const phoneMatch =
            r.phone.toLowerCase().includes(q) ||
            (cleanNum.length >= 3 && r.phone.replace(/\D/g, "").includes(cleanNum));
          const extMatch = r.extension ? r.extension.toLowerCase().includes(q) : false;
          if (!nameMatch && !compMatch && !emailMatch && !notesMatch && !phoneMatch && !extMatch) {
            return false;
          }
        }
        if (activeDivision === "vendor") return r.division === "vendor";
        if (activeDivision === "employee") return r.division === "employee";
        return true;
      })
      .sort((a, b) => {
        // Vendors appear first in search results and when viewing All
        if (a.division !== b.division) {
          return a.division === "vendor" ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  }, [records, activeDivision, activeSearchFilter]);

  // Filter directory to show ONLY searched records (replaces broken jumping on mobile)
  const handleSearchFilter = useCallback(
    (filterTerm: string, record?: DirectoryRecord) => {
      setActiveSearchFilter(filterTerm.trim());
      if (record) {
        setActiveDivision(record.division);
        setFocusedRecordId(record.id);
        setTimeout(() => setFocusedRecordId(null), 3500);
      } else {
        setActiveDivision("all");
      }
    },
    []
  );

  // Pagination (10 records per page, only active when needed)
  const PAGE_SIZE = 10;
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeDivision, activeSearchFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const validCurrentPage = Math.min(currentPage, totalPages);

  const paginatedRecords = useMemo(() => {
    const start = (validCurrentPage - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, validCurrentPage]);

  // Jump to selected record and scroll it into view with smooth highlight
  const handleJumpToRecord = useCallback(
    (record: DirectoryRecord) => {
      // 1. Ensure the record is visible in the active division tab
      setActiveDivision((current) => {
        if (current !== "all" && current !== record.division) {
          return record.division;
        }
        return current;
      });

      setFocusedRecordId(record.id);

      // 2. Perform smooth scroll after state update/DOM render
      setTimeout(() => {
        const el =
          document.getElementById(`contact-row-${record.id}`) ||
          document.getElementById(`contact-card-${record.id}`);

        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);

      // 3. Clear the glowing highlight after 3.5s
      setTimeout(() => {
        setFocusedRecordId((prev) => (prev === record.id ? null : prev));
      }, 3500);

      setToast({
        title: record.name,
        description: `Jumped to ${record.division === "vendor" ? "Vendor" : "Employee"} record`,
        type: "info",
        metric: "Focused",
      });
    },
    []
  );

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <ExecutiveToast
          type={toast.type || "success"}
          title={toast.title}
          description={toast.description}
          metric={toast.metric}
          position={getToastPosition(toast.title)}
          onClose={() => setToast(null)}
        />
      )}

      {/* 1. TOP HEADER & ACTION BAR */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 pb-3 sm:pb-4">
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
            <BookUser className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg sm:text-2xl font-black text-slate-900 tracking-tight truncate">
              Phone Directory
            </h1>
            <p className="hidden sm:block text-xs sm:text-sm text-slate-500 mt-0.5">
              Secure communications registry • Single-source telephone and direct contact book
            </p>
          </div>
        </div>

        {/* Dynamic Add Button (replaces 'Employees & Vendors' badge) */}
        <button
          type="button"
          onClick={() => {
            setEditingRecord(null);
            setIsContactModalOpen(true);
          }}
          className={`flex items-center justify-center gap-1.5 px-3 sm:px-4 py-2 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md active:scale-95 transition-all cursor-pointer shrink-0 ${
            activeDivision === "vendor"
              ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/20"
              : "bg-blue-600 hover:bg-blue-700 shadow-blue-500/20"
          }`}
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap font-bold">
            {activeDivision === "employee"
              ? "Add Employee"
              : activeDivision === "vendor"
              ? "Add Vendor"
              : "Add Record"}
          </span>
        </button>
      </div>

      {/* 2. GLOBAL SEARCH ALL BAR (Clean full-width trigger with Globe icon) */}
      <div className="w-full">
        <button
          type="button"
          onClick={() => setIsSearchPaletteOpen(true)}
          className="w-full flex items-center justify-between px-3.5 sm:px-4 py-2.5 sm:py-3 bg-white hover:bg-slate-50 border border-slate-200/90 hover:border-blue-400 rounded-2xl text-xs sm:text-sm text-slate-500 shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Search className="w-4 h-4 text-blue-600 group-hover:scale-110 transition-transform shrink-0" />
            <span className="font-medium text-slate-600 truncate">
              Search across employees, vendors, phone numbers, emails...
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-2">
            <span className="hidden sm:inline-flex items-center gap-0.5 px-2 py-0.5 rounded-lg bg-slate-100 text-[10px] sm:text-[11px] font-mono font-bold text-slate-500 border border-slate-200">
              Ctrl + K
            </span>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-blue-50 group-hover:bg-blue-100 text-blue-600 border border-blue-200/70 flex items-center justify-center transition-colors shadow-2xs">
              <Globe className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
          </div>
        </button>
      </div>

      {/* 3. DIVISION SEGMENTED SWITCHER (Proportional width for mobile: Vendors, Employees, All) */}
      <div className="w-full max-w-full overflow-hidden flex items-center gap-1 sm:gap-1.5 p-1 bg-slate-100 rounded-xl sm:rounded-2xl">
        <button
          type="button"
          onClick={() => setActiveDivision("vendor")}
          className={`flex-[1.05] sm:flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2 py-1.5 sm:py-2.5 px-1 sm:px-3 rounded-lg sm:rounded-xl text-[11px] sm:text-sm font-bold transition-all cursor-pointer ${
            activeDivision === "vendor"
              ? "bg-white text-indigo-700 shadow-xs border border-indigo-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="whitespace-nowrap">Vendors</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold shrink-0 ${
              activeDivision === "vendor"
                ? "bg-indigo-100 text-indigo-800"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {vendorCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveDivision("employee")}
          className={`flex-[1.35] sm:flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2 py-1.5 sm:py-2.5 px-1 sm:px-3 rounded-lg sm:rounded-xl text-[11px] sm:text-sm font-bold transition-all cursor-pointer ${
            activeDivision === "employee"
              ? "bg-white text-blue-700 shadow-xs border border-blue-200/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span className="whitespace-nowrap">Employees</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold shrink-0 ${
              activeDivision === "employee"
                ? "bg-blue-100 text-blue-800"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {employeeCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveDivision("all")}
          className={`flex-[0.65] sm:flex-1 min-w-0 flex items-center justify-center gap-1 sm:gap-2 py-1.5 sm:py-2.5 px-1 sm:px-3 rounded-lg sm:rounded-xl text-[11px] sm:text-sm font-bold transition-all cursor-pointer ${
            activeDivision === "all"
              ? "bg-white text-slate-900 shadow-xs border border-slate-300/60"
              : "text-slate-600 hover:text-slate-900"
          }`}
        >
          <span className="whitespace-nowrap">All</span>
          <span
            className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] font-mono font-bold shrink-0 ${
              activeDivision === "all"
                ? "bg-slate-200 text-slate-900 font-black"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {totalCount}
          </span>
        </button>
      </div>

      {/* Active Search Filter Banner */}
      {activeSearchFilter && (
        <div className="flex items-center justify-between bg-blue-50/90 border border-blue-200/90 rounded-2xl px-3.5 sm:px-4 py-2.5 text-xs text-blue-950 shadow-2xs animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Search className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1 truncate">
              <span>Showing search results for: </span>
              <strong className="font-bold underline decoration-blue-400">"{activeSearchFilter}"</strong>
              <span className="ml-2 px-2 py-0.5 rounded-full bg-blue-200/80 text-blue-900 font-mono text-[11px] font-bold">
                {filteredRecords.length} found
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setActiveSearchFilter("")}
            className="ml-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs active:scale-95"
          >
            <X className="w-3.5 h-3.5" />
            <span>Clear Filter</span>
          </button>
        </div>
      )}

      {/* CONTACTS DATA TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-slate-500">
            <Loader2 className="w-8 h-8 mx-auto text-blue-600 animate-spin mb-3" />
            <p className="font-bold text-sm text-slate-800">
              Deriving Key &amp; Decrypting Phone Directory...
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Loading encrypted records securely from Supabase
            </p>
          </div>
        ) : filteredRecords.length === 0 ? (
          <div className="py-16 px-4 text-center">
            {records.length === 0 ? (
              /* Completely Empty State */
              <div className="max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-3xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto shadow-inner">
                  <BookUser className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    Your Phone Directory is Empty
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-500 mt-1 leading-relaxed">
                    Import your employee &amp; vendor phone numbers via Excel spreadsheet, or start adding records manually. Data is automatically hashed and encrypted in Supabase.
                  </p>
                </div>

                <div className="flex items-center justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingRecord(null);
                      setIsContactModalOpen(true);
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-500/20 transition-all cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add First Contact</span>
                  </button>
                </div>

                {/* Demo seed data shortcut */}
                <div className="pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleLoadSampleData}
                    className="inline-flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Or populate with starter demo contacts</span>
                  </button>
                </div>
              </div>
            ) : (
              /* No search match */
              <div className="space-y-3">
                <Search className="w-8 h-8 mx-auto text-slate-300" />
                <p className="font-bold text-sm text-slate-700">No matching contacts</p>
                <p className="text-xs text-slate-400">
                  Try adjusting your search query, division tab, or alphabet filter.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveDivision("all")}
                  className="px-3 py-1 text-xs font-semibold text-blue-600 hover:underline cursor-pointer"
                >
                  Show all contacts
                </button>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* 1. MOBILE CARD VIEW (Elements appear in one go without horizontal scrolling) */}
            <div className="md:hidden divide-y divide-slate-100">
              {paginatedRecords.map((contact, idx) => {
                const isEmployee = contact.division === "employee";
                const initials = contact.name
                  ? contact.name
                      .split(" ")
                      .map((p) => p[0])
                      .filter(Boolean)
                      .slice(0, 2)
                      .join("")
                      .toUpperCase()
                  : "??";

                return (
                  <div
                    key={contact.id}
                    id={`contact-card-${contact.id}`}
                    style={{ animationDelay: `${Math.min(idx * 25, 250)}ms` }}
                    className={`p-3.5 space-y-2.5 transition-all duration-300 rounded-2xl animate-card-enter hover:-translate-y-0.5 hover:shadow-md active:scale-[0.985] ${
                      focusedRecordId === contact.id
                        ? "bg-indigo-50/90 ring-2 ring-indigo-500 shadow-md"
                        : "hover:bg-slate-50/70"
                    }`}
                  >
                    {/* Top Row: Avatar + Name + Division Badge + Edit/Delete */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-2xs ${
                            isEmployee
                              ? "bg-gradient-to-br from-blue-600 to-blue-700"
                              : "bg-gradient-to-br from-indigo-600 to-indigo-700"
                          }`}
                        >
                          {initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-slate-900 text-sm truncate">
                              {contact.name}
                            </span>
                            <span
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                isEmployee
                                  ? "bg-blue-50 text-blue-700 border-blue-200"
                                  : "bg-indigo-50 text-indigo-700 border-indigo-200"
                              }`}
                            >
                              {isEmployee ? "Employee" : "Vendor"}
                            </span>
                          </div>
                          <div className="text-xs font-medium text-slate-500 truncate flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                            <span className="truncate">{contact.company || "Corporate"}</span>
                          </div>
                        </div>
                      </div>

                      {/* Quick Actions (Edit, Delete) */}
                      <div className="flex items-center gap-0.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRecord(contact);
                            setIsContactModalOpen(true);
                          }}
                          title="Edit Record"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setRecordToDelete(contact)}
                          title="Delete Record"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Middle: Phone & Email in one view */}
                    <div className="space-y-1.5 pt-0.5 text-xs">
                      {contact.phone && (
                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/70 gap-2">
                          <div className="flex items-center gap-1.5 font-mono font-semibold text-slate-800 text-[11px] sm:text-xs min-w-0 flex-1">
                            <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span className="select-all flex items-center gap-1.5 min-w-0 flex-wrap">
                              <span className="truncate">{contact.phone}</span>
                              {contact.extension && (
                                <span
                                  title={`Extension: ${contact.extension}`}
                                  className="inline-flex items-center rounded overflow-hidden border border-indigo-200 text-[9.5px] font-mono shrink-0 shadow-2xs select-all align-middle"
                                >
                                  <span className="bg-indigo-600 text-white font-extrabold px-1 py-0.5 tracking-wider text-[8.5px] leading-none">
                                    EXT
                                  </span>
                                  <span className="bg-indigo-50/90 text-indigo-900 font-bold px-1.5 py-0.5 leading-none">
                                    {contact.extension.replace(/^(ext|x|ext\.|ext:)\s*/i, "")}
                                  </span>
                                </span>
                              )}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-1">
                            <a
                              href={`tel:${contact.phone.replace(/[^\d+]/g, "")}${contact.extension ? `,${contact.extension.replace(/^(ext|x|ext\.|ext:)\s*/i, "")}` : ""}`}
                              className="px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-[10.5px] sm:text-[11px] flex items-center gap-1 shadow-2xs transition-all"
                              title={`Call ${contact.phone}${contact.extension ? ` ext. ${contact.extension}` : ""}`}
                            >
                              <Phone className="w-3 h-3" />
                              <span>Call</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(contact.phone, contact.id, "phone")}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
                              title="Copy Phone"
                            >
                              {copiedField?.id === contact.id && copiedField?.type === "phone" ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {contact.email && (
                        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/70">
                          <div className="flex items-center gap-2 text-slate-700 text-xs truncate">
                            <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span className="select-all truncate">{contact.email}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0 ml-2">
                            <button
                              type="button"
                              onClick={() => copyToClipboard(contact.email, contact.id, "email")}
                              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer"
                              title="Copy Email"
                            >
                              {copiedField?.id === contact.id && copiedField?.type === "email" ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {contact.notes && (
                        <div className="px-2.5 py-1.5 text-[11px] text-slate-600 bg-slate-50 rounded-xl border border-slate-200/60 flex items-start gap-1.5">
                          <FileText className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                          <span className="break-words leading-relaxed">{contact.notes}</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 2. DESKTOP / TABLET MULTI-COLUMN TABLE (Visible on md and above) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Contact</th>
                    <th className="py-3 px-4">Division</th>
                    <th className="py-3 px-4">Company</th>
                    <th className="py-3 px-4">Phone Number</th>
                    <th className="py-3 px-4">Email</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedRecords.map((contact, idx) => {
                    const isEmployee = contact.division === "employee";
                    const initials = contact.name
                      ? contact.name
                          .split(" ")
                          .map((p) => p[0])
                          .filter(Boolean)
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()
                      : "??";

                    return (
                      <tr
                        key={contact.id}
                        id={`contact-row-${contact.id}`}
                        style={{ animationDelay: `${Math.min(idx * 20, 200)}ms` }}
                        className={`transition-all duration-300 group animate-card-enter ${
                          focusedRecordId === contact.id
                            ? "bg-indigo-50/90 ring-2 ring-indigo-500 shadow-md"
                            : "hover:bg-slate-50/80"
                        }`}
                      >
                        {/* Name & Title */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-2xs ${
                                isEmployee
                                  ? "bg-gradient-to-br from-blue-600 to-blue-700"
                                  : "bg-gradient-to-br from-indigo-600 to-indigo-700"
                              }`}
                            >
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 truncate">
                                {contact.name}
                              </p>
                              {contact.notes && (
                                <p className="text-[11px] text-slate-400 truncate max-w-[200px]">
                                  {contact.notes}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Division Badge */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                              isEmployee
                                ? "bg-blue-50 text-blue-700 border-blue-200"
                                : "bg-indigo-50 text-indigo-700 border-indigo-200"
                            }`}
                          >
                            {isEmployee ? (
                              <User className="w-3 h-3" />
                            ) : (
                              <Building2 className="w-3 h-3" />
                            )}
                            {isEmployee ? "Employee" : "Vendor"}
                          </span>
                        </td>

                        {/* Company */}
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800">
                            {contact.company || "—"}
                          </span>
                        </td>

                        {/* Phone Number with Copy & Separate Extension Pill */}
                        <td className="py-3 px-4">
                          {contact.phone ? (
                            <div className="flex items-center gap-1.5 font-mono text-xs text-slate-800 flex-wrap">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(contact.phone, contact.id, "phone")}
                                title="Copy Phone Number"
                                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                {copiedField?.id === contact.id && copiedField?.type === "phone" ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <span className="font-semibold select-all flex items-center gap-1.5 flex-wrap">
                                <span>{contact.phone}</span>
                                {contact.extension && (
                                  <span
                                    title={`Extension: ${contact.extension}`}
                                    className="inline-flex items-center rounded overflow-hidden border border-indigo-200 text-[9.5px] font-mono shrink-0 shadow-2xs select-all align-middle ml-0.5"
                                  >
                                    <span className="bg-indigo-600 text-white font-extrabold px-1 py-0.5 tracking-wider text-[8.5px] leading-none">
                                      EXT
                                    </span>
                                    <span className="bg-indigo-50/90 text-indigo-900 font-bold px-1.5 py-0.5 leading-none">
                                      {contact.extension.replace(/^(ext|x|ext\.|ext:)\s*/i, "")}
                                    </span>
                                  </span>
                                )}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">No phone</span>
                          )}
                        </td>

                        {/* Email with Copy */}
                        <td className="py-3 px-4">
                          {contact.email ? (
                            <div className="flex items-center gap-1.5 text-xs text-slate-700">
                              <button
                                type="button"
                                onClick={() => copyToClipboard(contact.email, contact.id, "email")}
                                title="Copy Email Address"
                                className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                              >
                                {copiedField?.id === contact.id && copiedField?.type === "email" ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <span className="truncate max-w-[180px] select-all">
                                {contact.email}
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-xs">No email</span>
                          )}
                        </td>

                        {/* Actions: Edit, Delete */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingRecord(contact);
                                setIsContactModalOpen(true);
                              }}
                              title="Edit Record"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setRecordToDelete(contact)}
                              title="Delete Record"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer Record Count & Pagination (10 per page, only when needed) */}
        <div className="px-4 py-3 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div>
            Showing{" "}
            <span className="font-bold text-slate-800">
              {filteredRecords.length === 0
                ? 0
                : `${(validCurrentPage - 1) * PAGE_SIZE + 1}–${Math.min(
                    validCurrentPage * PAGE_SIZE,
                    filteredRecords.length
                  )}`}
            </span>{" "}
            of{" "}
            <span className="font-bold text-slate-800">{filteredRecords.length}</span>{" "}
            directory records
          </div>

          {/* Pagination Controls - only show when pagination is needed (> 10 records) */}
          {totalPages > 1 && (
            <div className="flex items-center gap-1.5 select-none">
              <button
                type="button"
                onClick={() => {
                  setCurrentPage((p) => Math.max(p - 1, 1));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={validCurrentPage === 1}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Prev</span>
              </button>

              <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-xs font-mono font-bold text-slate-700 shadow-2xs">
                <span>{validCurrentPage}</span>
                <span className="text-slate-400">/</span>
                <span>{totalPages}</span>
              </div>

              <button
                type="button"
                onClick={() => {
                  setCurrentPage((p) => Math.min(p + 1, totalPages));
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                disabled={validCurrentPage === totalPages}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold text-slate-700 transition-colors shadow-2xs cursor-pointer"
              >
                <span>Next</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}

      {/* 1. Ctrl + K Command Palette */}
      <DirectorySearchPalette
        isOpen={isSearchPaletteOpen}
        onClose={() => setIsSearchPaletteOpen(false)}
        records={records}
        onSelectRecord={handleJumpToRecord}
        onSearchFilter={handleSearchFilter}
      />

      {/* 2. Add / Edit Contact Modal */}
      <DirectoryContactModal
        isOpen={isContactModalOpen}
        onClose={() => {
          setIsContactModalOpen(false);
          setEditingRecord(null);
        }}
        onSave={handleSaveContact}
        initialRecord={editingRecord}
        defaultDivision={
          editingRecord
            ? editingRecord.division
            : activeDivision === "vendor"
            ? "vendor"
            : "employee"
        }
        isDivisionLocked={Boolean(editingRecord) || activeDivision !== "all"}
        existingCompanies={
          (editingRecord?.division || (activeDivision === "vendor" ? "vendor" : "employee")) === "vendor"
            ? vendorCompanies
            : employeeCompanies
        }
      />

      {/* 3. Security & Cryptographic Inspector Modal */}
      <DirectorySecurityModal
        isOpen={isSecurityModalOpen}
        onClose={() => setIsSecurityModalOpen(false)}
        sampleRecord={records[0] || null}
      />

      {/* 5. Delete Confirmation Modal */}
      {recordToDelete && typeof document !== "undefined" && createPortal(
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-sm overflow-y-auto overscroll-contain animate-in fade-in duration-150"
          onClick={() => setRecordToDelete(null)}
        >
          <div
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 space-y-4 my-auto animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center">
              <h4 className="text-base font-bold text-slate-900">
                Delete Contact?
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Are you sure you want to remove{" "}
                <span className="font-bold text-slate-800">
                  {recordToDelete.name}
                </span>{" "}
                from the directory? This action will permanently remove their encrypted data from Supabase.
              </p>
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRecordToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteRecord}
                disabled={isDeleting}
                className="flex-1 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-98 rounded-xl shadow-md shadow-rose-500/20 transition-all cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
