"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  Search,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";
import { ExecutiveToast } from "@/components/ui/ExecutiveToast";

export interface InvoiceRecord {
  id?: string;
  vendor_name: string;
  invoice_number?: string;
  amount: number;
  due_date?: string;
  days_overdue: number;
  status?: string;
  notes?: string;
  raw_data?: Record<string, any>;
  created_at?: string;
}

/**
 * Accurately calculates the exact number of calendar days overdue from a due date to today.
 * Uses pure UTC calendar date math to prevent daylight savings and timezone boundary shifts.
 */
export function calculateAgingDaysFromDueDate(dueDateStr?: string | number | null): number {
  if (!dueDateStr) return 0;

  let year: number, month: number, day: number;

  if (typeof dueDateStr === "number" && dueDateStr > 25000 && dueDateStr < 60000) {
    // Excel serial date (e.g. 45780)
    const jsDate = new Date((dueDateStr - 25569) * 86400 * 1000);
    year = jsDate.getUTCFullYear();
    month = jsDate.getUTCMonth();
    day = jsDate.getUTCDate();
  } else {
    const str = String(dueDateStr).trim();
    if (!str || str === "—") return 0;

    // 1. MM/DD/YYYY
    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      month = parseInt(slashMatch[1], 10) - 1;
      day = parseInt(slashMatch[2], 10);
      year = parseInt(slashMatch[3], 10);
    } else {
      // 2. YYYY-MM-DD
      const dashMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (dashMatch) {
        year = parseInt(dashMatch[1], 10);
        month = parseInt(dashMatch[2], 10) - 1;
        day = parseInt(dashMatch[3], 10);
      } else {
        const parsed = new Date(str);
        if (isNaN(parsed.getTime())) return 0;
        year = parsed.getFullYear();
        month = parsed.getMonth();
        day = parsed.getDate();
      }
    }
  }

  // Today in local calendar components:
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const dueUtc = Date.UTC(year, month, day);

  const diffMs = todayUtc - dueUtc;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return Math.max(0, diffDays);
}

export function InvoicesView() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragHover, setIsDragHover] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [agingFilter, setAgingFilter] = useState<"all" | "30" | "60" | "90+">("all");
  const [sortBy, setSortBy] = useState<"days_desc" | "amount_desc" | "vendor_asc">("days_desc");

  // Pagination State (50 rows per page)
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;

  // Selection State (click rows to select & copy formatted for Zoho Mail)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-dismiss status messages after 5 seconds
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => {
        setStatusMessage(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  // Fetch invoices from Supabase on mount
  const loadInvoices = async () => {
    setIsLoading(true);
    if (!supabase) {
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("invoices")
        .select("*")
        .order("days_overdue", { ascending: false });

      if (error) {
        console.error("Error loading invoices from Supabase:", error);
      } else if (data) {
        // Recalculate real-time aging as of today for all invoices
        const updated = data.map((inv) => {
          if (inv.due_date && inv.due_date !== "—") {
            const dynamicDays = calculateAgingDaysFromDueDate(inv.due_date);
            return {
              ...inv,
              days_overdue: dynamicDays,
              status: dynamicDays > 0 ? (inv.status && inv.status !== "Current" ? inv.status : "Overdue") : "Current",
            };
          }
          return inv;
        });

        setInvoices(updated);

        // Background sync: update database rows that have mismatched days_overdue
        const mismatched = updated.filter(
          (inv, idx) => inv.id && inv.days_overdue !== data[idx].days_overdue
        );
        if (mismatched.length > 0) {
          (async () => {
            try {
              for (const item of mismatched) {
                await supabase
                  .from("invoices")
                  .update({ days_overdue: item.days_overdue, status: item.status })
                  .eq("id", item.id);
              }
            } catch (syncErr) {
              console.warn("Background aging sync warning:", syncErr);
            }
          })();
        }
      }
    } catch (err) {
      console.error("Failed to load invoices:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInvoices();
  }, []);

  // Reset to first page when search, filter, or sorting changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, agingFilter, sortBy]);

  // Helper to extract clean numeric amount
  const parseAmount = (val: any): number => {
    if (typeof val === "number") return val;
    if (!val) return 0;
    const str = String(val).replace(/[^0-9.-]+/g, "");
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Helper to extract clean days overdue (prioritizes due_date to today)
  const parseDays = (val: any, dueDateVal: any): number => {
    // 1. If we have a valid due date, ALWAYS calculate aging accurately from due date to today:
    if (dueDateVal && dueDateVal !== "—") {
      return calculateAgingDaysFromDueDate(dueDateVal);
    }
    // 2. Fallback to numeric value from file only if no due date exists:
    if (typeof val === "number") return Math.max(0, Math.floor(val));
    if (val && !isNaN(parseInt(val, 10))) {
      return Math.max(0, parseInt(val, 10));
    }
    return 0;
  };

  // Helper to format any date string strictly as MM/DD/YYYY
  const formatDateMMDDYYYY = (rawDate?: string | number): string => {
    if (!rawDate) return "—";

    // Handle Excel numeric date serials (e.g. 45780)
    if (typeof rawDate === "number" && rawDate > 25000 && rawDate < 60000) {
      const jsDate = new Date((rawDate - 25569) * 86400 * 1000);
      const m = String(jsDate.getUTCMonth() + 1).padStart(2, "0");
      const d = String(jsDate.getUTCDate()).padStart(2, "0");
      const y = jsDate.getUTCFullYear();
      return `${m}/${d}/${y}`;
    }

    const str = String(rawDate).trim();
    if (!str || str === "—") return "—";

    // 1. If already MM/DD/YYYY (e.g. 5/1/2025 or 06/15/2025)
    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      const [, m, d, y] = slashMatch;
      return `${m.padStart(2, "0")}/${d.padStart(2, "0")}/${y}`;
    }

    // 2. If YYYY-MM-DD (e.g. 2025-06-15)
    const dashMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (dashMatch) {
      const [, y, m, d] = dashMatch;
      return `${m.padStart(2, "0")}/${d.padStart(2, "0")}/${y}`;
    }

    // 3. Fallback date parse
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
      const month = String(d.getUTCMonth() + 1).padStart(2, "0");
      const day = String(d.getUTCDate()).padStart(2, "0");
      const year = d.getUTCFullYear();
      return `${month}/${day}/${year}`;
    }

    return str;
  };

  // Intelligently map arbitrary columns to our standardized schema
  // Prioritizes exact columns: Client, Invoice Number, Due Date, Days Overdue, Balance Due
  const normalizeRow = (row: Record<string, any>): InvoiceRecord | null => {
    const keys = Object.keys(row);
    if (keys.length === 0) return null;

    // Helper: look up key by priority list of exact normalized names
    const getByPriority = (priorityList: string[]) => {
      for (const pref of priorityList) {
        const prefNorm = pref.toLowerCase().replace(/[^a-z0-9]/g, "");
        const found = keys.find(
          (k) => k.toLowerCase().replace(/[^a-z0-9]/g, "") === prefNorm
        );
        if (found && row[found] !== undefined && row[found] !== null && String(row[found]).trim() !== "") {
          return row[found];
        }
      }
      for (const pref of priorityList) {
        const prefNorm = pref.toLowerCase().replace(/[^a-z0-9]/g, "");
        const found = keys.find(
          (k) => k.toLowerCase().replace(/[^a-z0-9]/g, "").includes(prefNorm)
        );
        if (found && row[found] !== undefined && row[found] !== null && String(row[found]).trim() !== "") {
          return row[found];
        }
      }
      return undefined;
    };

    // 1. Client / Vendor Name
    const vendor =
      getByPriority(["Client", "Vendor", "Client Name", "Vendor Name", "Customer", "Company", "Supplier", "Name"]) ||
      row[keys[0]] ||
      "Unknown Vendor";

    // 2. Invoice Number
    const invoiceNum =
      getByPriority(["Invoice Number", "Invoice #", "Invoice No", "Invoice", "Inv Number", "Bill Number", "Ref"]) || "";

    // 3. Amount Due -> MUST prioritize 'Balance Due' as in user's Excel
    const rawAmount =
      getByPriority([
        "Balance Due",
        "BalanceDue",
        "Amount Due",
        "AmountDue",
        "Open Balance",
        "Balance",
        "Amount",
        "Total Due",
        "Net Due",
      ]);
    const amount = parseAmount(rawAmount);

    // 4. Due Date -> MUST prioritize 'Due Date' and NEVER match 'Issue Date' or 'Invoice Date'
    const rawDueDate =
      getByPriority([
        "Due Date",
        "DueDate",
        "Payment Due Date",
        "Payment Due",
        "Date Due",
        "Expected Date",
      ]);
    const dueDateStr = rawDueDate ? formatDateMMDDYYYY(rawDueDate) : "";

    // 5. Days Overdue / Aging
    const rawDays =
      getByPriority(["Days Overdue", "DaysOverdue", "Overdue Days", "Aging", "Days Past Due", "Days"]);
    const daysOverdue = parseDays(rawDays, dueDateStr);

    // 6. Notes / Aging Bucket
    const notes =
      getByPriority(["Last Note", "Aging Bucket", "Notes", "Memo", "Description", "Remarks"]) || "";

    return {
      vendor_name: String(vendor).trim(),
      invoice_number: String(invoiceNum).trim(),
      amount: amount,
      due_date: dueDateStr,
      days_overdue: daysOverdue,
      status: daysOverdue > 0 ? "Overdue" : "Current",
      notes: String(notes).trim(),
      raw_data: row,
    };
  };

  // Process and upload file
  const handleFileUpload = async (file: File) => {
    setIsProcessing(true);
    setStatusMessage(null);

    try {
      const fileName = file.name.toLowerCase();
      let parsedRows: Record<string, any>[] = [];

      if (fileName.endsWith(".csv")) {
        const text = await file.text();
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        parsedRows = result.data as Record<string, any>[];
      } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        parsedRows = XLSX.utils.sheet_to_json(sheet);
      } else {
        throw new Error("Please upload a .csv, .xlsx, or .xls file.");
      }

      if (parsedRows.length === 0) {
        throw new Error("No data rows found in the uploaded file.");
      }

      const recordsToInsert: InvoiceRecord[] = [];
      for (const raw of parsedRows) {
        const item = normalizeRow(raw);
        if (item && item.vendor_name) {
          recordsToInsert.push(item);
        }
      }

      if (recordsToInsert.length === 0) {
        throw new Error("Could not parse invoice records. Please check the file columns.");
      }

      if (!supabase) {
        throw new Error("Supabase is not initialized.");
      }

      // 1. PURGE ALL OLD INVOICE DATA from Supabase
      await supabase
        .from("invoices")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      // 2. INSERT NEW FRESH INVOICES in batches of 100
      const batchSize = 100;
      for (let i = 0; i < recordsToInsert.length; i += batchSize) {
        const batch = recordsToInsert.slice(i, i + batchSize).map((r) => ({
          user_id: "chief",
          vendor_name: r.vendor_name,
          invoice_number: r.invoice_number || null,
          amount: r.amount,
          due_date: r.due_date || null,
          days_overdue: r.days_overdue,
          status: r.status || "Overdue",
          notes: r.notes || null,
          raw_data: r.raw_data || null,
        }));

        const { error: insertError } = await supabase.from("invoices").insert(batch);
        if (insertError) {
          throw new Error(`Insert failed: ${insertError.message}`);
        }
      }

      // 3. Reload from Supabase
      await loadInvoices();
      setSelectedIds(new Set());
      setCurrentPage(1);
      setStatusMessage({
        type: "success",
        text: `Successfully purged previous data and imported ${recordsToInsert.length} fresh invoices!`,
      });
    } catch (err: any) {
      console.error("Upload error:", err);
      setStatusMessage({
        type: "error",
        text: err.message || "Failed to process and upload file.",
      });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Filter & Sort Logic
  const filteredInvoices = invoices
    .filter((inv) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        inv.vendor_name.toLowerCase().includes(q) ||
        (inv.invoice_number && inv.invoice_number.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (agingFilter === "30") return inv.days_overdue <= 30;
      if (agingFilter === "60") return inv.days_overdue > 30 && inv.days_overdue <= 60;
      if (agingFilter === "90+") return inv.days_overdue > 60;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "days_desc") return b.days_overdue - a.days_overdue;
      if (sortBy === "amount_desc") return b.amount - a.amount;
      if (sortBy === "vendor_asc") return a.vendor_name.localeCompare(b.vendor_name);
      return 0;
    });

  // Pagination Calculations (50 rows per page)
  const totalPages = Math.ceil(filteredInvoices.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredInvoices.length);
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

  // Selection handlers
  const toggleSelectRow = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const toggleSelectCurrentPage = () => {
    const currentPageRowIds = paginatedInvoices.map(
      (inv) => inv.id || inv.invoice_number || inv.vendor_name
    );
    const allCurrentSelected = currentPageRowIds.every((id) => selectedIds.has(id));

    const next = new Set(selectedIds);
    if (allCurrentSelected) {
      currentPageRowIds.forEach((id) => next.delete(id));
    } else {
      currentPageRowIds.forEach((id) => next.add(id));
    }
    setSelectedIds(next);
  };

  // ==========================================
  // ZOHO MAIL FORMATTED COPY GENERATOR
  // Ordered: 1. Vendor, 2. Invoice, 3. Amount Due, 4. Due Date, 5. Aging (no "days")
  // Vivid blue header #0070C0, bold white text, clean black 1px borders
  // ==========================================
  const copyFormattedForZoho = async (targetInvoices: InvoiceRecord[]) => {
    if (targetInvoices.length === 0) return;

    const headers = ["Vendor", "Invoice", "Amount Due", "Due Date", "Aging"];

    const getRowValues = (inv: InvoiceRecord) => [
      inv.vendor_name,
      inv.invoice_number || "—",
      `$${inv.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      formatDateMMDDYYYY(inv.due_date),
      inv.days_overdue ?? 0, // Clean number only, without "days"
    ];

    // Generate rich HTML table matching Zoho Mail specs
    const headerHtml = headers
      .map(
        (h, i) =>
          `<th style="background-color: #0070C0; color: #FFFFFF; font-weight: bold; font-family: Calibri, Arial, sans-serif; font-size: 13px; border: 1px solid #000000; padding: 7px 14px; text-align: ${
            i === 0 ? "left" : i === 2 ? "right" : "center"
          };">${h}</th>`
      )
      .join("");

    const rowsHtml = targetInvoices
      .map((inv) => {
        const vals = getRowValues(inv);
        const cellsHtml = vals
          .map(
            (val, i) =>
              `<td style="background-color: #FFFFFF; color: #000000; font-family: Calibri, Arial, sans-serif; font-size: 13px; border: 1px solid #000000; padding: 6px 14px; text-align: ${
                i === 0 ? "left" : i === 2 ? "right" : "center"
              }; font-weight: ${i === 2 || i === 4 ? "bold" : "normal"};">${val}</td>`
          )
          .join("");
        return `<tr>${cellsHtml}</tr>`;
      })
      .join("");

    const fullHtml = `<table style="border-collapse: collapse; border: 1px solid #000000; font-family: Calibri, Arial, sans-serif; font-size: 13px; margin: 8px 0;"><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table>`;

    // Plain text TSV fallback for Excel/Notepad
    const plainTsv = [
      headers.join("\t"),
      ...targetInvoices.map((inv) => getRowValues(inv).join("\t")),
    ].join("\n");

    try {
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        const htmlBlob = new Blob([fullHtml], { type: "text/html" });
        const textBlob = new Blob([plainTsv], { type: "text/plain" });
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": htmlBlob,
            "text/plain": textBlob,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plainTsv);
      }

      setCopiedNotification(
        `✓ Copied ${targetInvoices.length} row${targetInvoices.length > 1 ? "s" : ""} formatted for Zoho Mail!`
      );
      setTimeout(() => setCopiedNotification(null), 3500);
    } catch (err) {
      console.error("Clipboard copy error:", err);
      navigator.clipboard.writeText(plainTsv);
      setCopiedNotification("✓ Copied data to clipboard!");
      setTimeout(() => setCopiedNotification(null), 2500);
    }
  };

  // Keyboard shortcut Ctrl+C / Cmd+C when rows are selected
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (selectedIds.size > 0 && !window.getSelection()?.toString()) {
          const selectedInvoices = invoices.filter((inv) =>
            selectedIds.has(inv.id || inv.invoice_number || inv.vendor_name)
          );
          if (selectedInvoices.length > 0) {
            e.preventDefault();
            copyFormattedForZoho(selectedInvoices);
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIds, invoices]);

  const selectedRowsList = invoices.filter((inv) =>
    selectedIds.has(inv.id || inv.invoice_number || inv.vendor_name)
  );

  return (
    <div className="space-y-6 relative pb-16">
      {/* ==================================================== */}
      {/* FLOATING TOP-CENTER NOTIFICATIONS (STATUS & COPY)    */}
      {/* ==================================================== */}
      {statusMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[calc(100vw-24px)] sm:max-w-lg flex justify-center animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-auto">
          <ExecutiveToast
            type={statusMessage.type}
            title={statusMessage.text}
            headerMeta="Vendor Accounts Ledger"
            metric={statusMessage.type === "error" ? "Import Alert" : "Ledger Synced"}
            onClose={() => setStatusMessage(null)}
            durationMs={4000}
          />
        </div>
      )}

      {copiedNotification && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-[calc(100vw-24px)] sm:max-w-lg flex justify-center animate-in fade-in slide-in-from-top-4 duration-200 pointer-events-auto">
          <ExecutiveToast
            type="info"
            title={copiedNotification}
            description="Formatted for Zoho Mail with blue table headers and cell borders."
            headerMeta="Zoho Mail Clipboard"
            metric="Copied HTML"
            onClose={() => setCopiedNotification(null)}
            durationMs={3500}
          />
        </div>
      )}

      {/* Top Header Row (Export CSV, Purge, and Refresh buttons removed as requested) */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Overdue Invoices
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Import spreadsheets (.csv or .xlsx) to analyze overdue aging balances and prepare vendor statements.
          </p>
        </div>

        {/* Sole Action: Dedicated Upload Button (Feels like a real upload component with compact width) */}
        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv, .xlsx, .xls"
            className="hidden"
            onClick={(e) => {
              (e.target as HTMLInputElement).value = "";
            }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />

          <button
            type="button"
            disabled={isProcessing}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragHover(true);
            }}
            onDragLeave={() => setIsDragHover(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragHover(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFileUpload(file);
            }}
            onClick={() => {
              if (fileInputRef.current) {
                fileInputRef.current.value = "";
                fileInputRef.current.click();
              }
            }}
            className={`group relative inline-flex items-center gap-3 px-4 py-2 sm:px-4.5 sm:py-2.5 rounded-xl sm:rounded-2xl transition-all duration-200 cursor-pointer disabled:opacity-50 select-none ${
              isDragHover
                ? "bg-blue-700 text-white shadow-lg ring-4 ring-blue-500/30 scale-[1.02]"
                : "bg-[#2563eb] hover:bg-blue-600 active:scale-98 text-white shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35"
            }`}
          >
            <div className="w-8 h-8 rounded-lg sm:rounded-xl bg-white/20 border border-white/25 flex items-center justify-center shrink-0 shadow-2xs group-hover:-translate-y-0.5 transition-transform">
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : (
                <Upload className="w-4 h-4 text-white" />
              )}
            </div>

            <div className="text-left pr-1">
              <div className="text-xs sm:text-[13px] font-bold leading-tight tracking-tight text-white flex items-center gap-1.5">
                <span>{isProcessing ? "Processing File..." : "Upload File"}</span>
              </div>
              <div className="text-[10px] text-blue-100 font-medium leading-tight mt-0.5">
                Drop or select .csv / .xlsx
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs">
        {/* Table Filters & Search Toolbar */}
        <div className="p-4 border-b border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 rounded-t-2xl">
          {/* Search Input */}
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search vendor or invoice number..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all"
            />
          </div>

          {/* Filter Pills & Select Page Action */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex rounded-lg bg-slate-100 p-1 border border-slate-200/70 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setAgingFilter("all")}
                className={`px-3 py-1 rounded-md transition-all ${
                  agingFilter === "all" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                All ({invoices.length})
              </button>
              <button
                type="button"
                onClick={() => setAgingFilter("30")}
                className={`px-3 py-1 rounded-md transition-all ${
                  agingFilter === "30" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                1-30 Days
              </button>
              <button
                type="button"
                onClick={() => setAgingFilter("60")}
                className={`px-3 py-1 rounded-md transition-all ${
                  agingFilter === "60" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                31-60 Days
              </button>
              <button
                type="button"
                onClick={() => setAgingFilter("90+")}
                className={`px-3 py-1 rounded-md transition-all ${
                  agingFilter === "90+" ? "bg-white text-slate-900 shadow-xs" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                60+ Days
              </button>
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600 transition-colors"
            >
              <option value="days_desc">Sort: Most Overdue</option>
              <option value="amount_desc">Sort: Highest Amount</option>
              <option value="vendor_asc">Sort: Vendor (A-Z)</option>
            </select>

            {/* Optional Select Page Toggle */}
            {paginatedInvoices.length > 0 && (
              <button
                type="button"
                onClick={toggleSelectCurrentPage}
                className="px-3 py-2 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                {paginatedInvoices.every((inv) =>
                  selectedIds.has(inv.id || inv.invoice_number || inv.vendor_name)
                )
                  ? "Deselect Page"
                  : `Select Page (${paginatedInvoices.length})`}
              </button>
            )}
          </div>
        </div>

        {/* Table Content */}
        {isLoading ? (
          <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-xs font-semibold">Loading invoices from database...</span>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="py-20 px-4 flex flex-col items-center justify-center text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-600 mb-4 shadow-xs">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              {invoices.length === 0 ? "No invoices imported yet" : "No matching invoices found"}
            </h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              {invoices.length === 0
                ? "Upload your overdue aging report (.csv or .xlsx). Every new import stores safely in Supabase and purges the previous file."
                : "Try clearing your search query or aging filter."}
            </p>
            {invoices.length === 0 && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563eb] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <span>Upload CSV or Excel File</span>
              </button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Full Table View (>= md) */}
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="sticky top-0 z-20 py-3.5 px-5 bg-slate-50 border-b border-slate-200/80 shadow-2xs">Vendor</th>
                    <th className="sticky top-0 z-20 py-3.5 px-4 bg-slate-50 border-b border-slate-200/80 shadow-2xs font-mono">Invoice</th>
                    <th className="sticky top-0 z-20 py-3.5 px-4 text-right bg-slate-50 border-b border-slate-200/80 shadow-2xs">Amount Due</th>
                    <th className="sticky top-0 z-20 py-3.5 px-4 text-center bg-slate-50 border-b border-slate-200/80 shadow-2xs">Due Date</th>
                    <th className="sticky top-0 z-20 py-3.5 px-4 text-center bg-slate-50 border-b border-slate-200/80 shadow-2xs">Aging</th>
                    <th className="sticky top-0 z-20 py-3.5 px-5 text-center bg-slate-50 border-b border-slate-200/80 shadow-2xs">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-medium">
                  {paginatedInvoices.map((inv, idx) => {
                    const rowId = inv.id || inv.invoice_number || inv.vendor_name;
                    const isSelected = selectedIds.has(rowId);
                    const isHighAlert = inv.days_overdue > 60;
                    const isMediumAlert = inv.days_overdue > 30 && inv.days_overdue <= 60;

                    return (
                      <tr
                        key={rowId || idx}
                        onClick={() => toggleSelectRow(rowId)}
                        className={`cursor-pointer transition-colors select-none ${
                          isSelected
                            ? "bg-blue-50/90 hover:bg-blue-100/70"
                            : "hover:bg-slate-50/80"
                        }`}
                      >
                        {/* 1. Vendor */}
                        <td className="py-3.5 px-5">
                          <div className="font-bold text-slate-900 break-words max-w-sm">
                            {inv.vendor_name}
                          </div>
                        </td>

                        {/* 2. Invoice */}
                        <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {inv.invoice_number || "—"}
                        </td>

                        {/* 3. Amount Due */}
                        <td className="py-3.5 px-4 text-right font-black text-slate-900 whitespace-nowrap">
                          ${inv.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* 4. Due Date */}
                        <td className="py-3.5 px-4 text-center text-slate-600 font-mono whitespace-nowrap">
                          {formatDateMMDDYYYY(inv.due_date)}
                        </td>

                        {/* 5. Aging (Number only, no 'days') */}
                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          {inv.days_overdue > 0 ? (
                            <span
                              className={`inline-flex items-center justify-center min-w-10 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                isHighAlert
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : isMediumAlert
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-orange-50 text-orange-700 border border-orange-200"
                              }`}
                            >
                              <span>{inv.days_overdue}</span>
                            </span>
                          ) : (
                            <span className="text-slate-400">0</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-5 text-center whitespace-nowrap">
                          <span
                            className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                              inv.days_overdue > 0
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {inv.status || "Overdue"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile / Tablet Responsive View (< md) - Zero horizontal scroll, all details in one go */}
            <div className="block md:hidden">
              {/* Sticky Mobile Header Row */}
              <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-xs px-4 py-2.5 border-b border-slate-200/80 shadow-2xs flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Vendor & Invoice</span>
                <span>Amount & Aging</span>
              </div>

              {/* Mobile Invoice Rows */}
              <div className="divide-y divide-slate-100">
                {paginatedInvoices.map((inv, idx) => {
                  const rowId = inv.id || inv.invoice_number || inv.vendor_name;
                  const isSelected = selectedIds.has(rowId);
                  const isHighAlert = inv.days_overdue > 60;
                  const isMediumAlert = inv.days_overdue > 30 && inv.days_overdue <= 60;

                  return (
                    <div
                      key={rowId || idx}
                      onClick={() => toggleSelectRow(rowId)}
                      className={`p-3.5 transition-colors cursor-pointer select-none flex items-start justify-between gap-3 ${
                        isSelected
                          ? "bg-blue-50/90 border-l-4 border-l-blue-600"
                          : "hover:bg-slate-50/80 bg-white border-l-4 border-l-transparent"
                      }`}
                    >
                      {/* Left: Vendor & Invoice Details */}
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-slate-900 text-xs leading-snug break-words">
                          {inv.vendor_name}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px] text-slate-500 font-medium">
                          <span className="font-mono text-slate-700 bg-slate-100 border border-slate-200/80 px-1.5 py-0.2 rounded text-[10px] font-semibold">
                            #{inv.invoice_number || "—"}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span className="text-slate-500">
                            Due {formatDateMMDDYYYY(inv.due_date)}
                          </span>
                        </div>
                      </div>

                      {/* Right: Amount & Overdue Aging */}
                      <div className="text-right shrink-0">
                        <div className="font-black text-slate-900 text-xs sm:text-sm">
                          ${inv.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="flex items-center justify-end gap-1.5 mt-1">
                          {inv.days_overdue > 0 ? (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isHighAlert
                                  ? "bg-rose-100 text-rose-800 border border-rose-200"
                                  : isMediumAlert
                                  ? "bg-amber-100 text-amber-800 border border-amber-200"
                                  : "bg-orange-50 text-orange-700 border border-orange-200"
                              }`}
                            >
                              {inv.days_overdue}d
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px] font-medium">0d</span>
                          )}
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                              inv.days_overdue > 0
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            {inv.status || "Overdue"}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Table Footer with 50-row Pagination Controls */}
        {filteredInvoices.length > 0 && (
          <div className="p-4 border-t border-slate-200/70 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 rounded-b-2xl">
            <div className="flex items-center gap-2">
              <span>
                Showing <strong>{startIndex + 1}</strong>–<strong>{endIndex}</strong> of <strong>{filteredInvoices.length}</strong> records (up to 50 per page)
                {selectedIds.size > 0 && (
                  <span className="ml-2 font-semibold text-blue-600">
                    ({selectedIds.size} selected)
                  </span>
                )}
              </span>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1.5 self-center sm:self-auto">
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold shadow-2xs transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Prev</span>
                </button>

                <div className="px-3 py-1 text-xs font-bold text-slate-700">
                  Page {currentPage} of {totalPages}
                </div>

                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-semibold shadow-2xs transition-colors"
                >
                  <span>Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Bottom Action Bar when Rows are Selected */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-4 py-2.5 sm:px-5 sm:py-3 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-3 sm:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200 max-w-[calc(100vw-24px)] w-auto">
          <div className="flex items-center gap-2 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
            <span>
              <strong>{selectedIds.size}</strong> {selectedIds.size === 1 ? "row" : "rows"} selected
            </span>
          </div>

          <div className="h-4 w-px bg-slate-700"></div>

          <button
            type="button"
            onClick={() => copyFormattedForZoho(selectedRowsList)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0070C0] hover:bg-blue-600 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy for Zoho Mail</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
