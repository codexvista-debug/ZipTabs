"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
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
  ChevronsLeft,
  ChevronsRight,
  ChevronDown,
  Clock,
  X,
  User,
  Sparkles,
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

export type HeaderStyleId = "style-01" | "style-02" | "style-03" | "style-04";

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

/**
 * Determines whether an invoice's due date falls within the Reminder window:
 * Today (current calendar date) -4 days to +4 days (inclusive).
 */
export function isWithinReminderWindow(dueDateStr?: string | number | null): boolean {
  if (!dueDateStr) return false;

  let year: number, month: number, day: number;

  if (typeof dueDateStr === "number" && dueDateStr > 25000 && dueDateStr < 60000) {
    const jsDate = new Date((dueDateStr - 25569) * 86400 * 1000);
    year = jsDate.getUTCFullYear();
    month = jsDate.getUTCMonth();
    day = jsDate.getUTCDate();
  } else {
    const str = String(dueDateStr).trim();
    if (!str || str === "—") return false;

    const slashMatch = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (slashMatch) {
      month = parseInt(slashMatch[1], 10) - 1;
      day = parseInt(slashMatch[2], 10);
      year = parseInt(slashMatch[3], 10);
    } else {
      const dashMatch = str.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (dashMatch) {
        year = parseInt(dashMatch[1], 10);
        month = parseInt(dashMatch[2], 10) - 1;
        day = parseInt(dashMatch[3], 10);
      } else {
        const parsed = new Date(str);
        if (isNaN(parsed.getTime())) return false;
        year = parsed.getFullYear();
        month = parsed.getMonth();
        day = parsed.getDate();
      }
    }
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const dueUtc = Date.UTC(year, month, day);

  const diffDays = Math.round((dueUtc - todayUtc) / (1000 * 60 * 60 * 24));
  return diffDays >= -4 && diffDays <= 4;
}

export function InvoicesView() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDragHover, setIsDragHover] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Active Header Style (Persisted in localStorage; defaults to style-02)
  const [activeHeaderStyle, setActiveHeaderStyle] = useState<HeaderStyleId>("style-02");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("ziptabs_active_header_style") as HeaderStyleId;
      if (saved && ["style-01", "style-02", "style-03", "style-04"].includes(saved)) {
        setActiveHeaderStyle(saved);
      }
    } catch {}

    const handleStyleChange = (e: any) => {
      if (e.detail && ["style-01", "style-02", "style-03", "style-04"].includes(e.detail)) {
        setActiveHeaderStyle(e.detail);
      }
    };

    window.addEventListener("ziptabs-header-style-changed", handleStyleChange);
    return () => window.removeEventListener("ziptabs-header-style-changed", handleStyleChange);
  }, []);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeVendorFilter, setActiveVendorFilter] = useState<string | null>(null);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [agingFilter, setAgingFilter] = useState<"all" | "reminder" | "30" | "60" | "90+">("all");
  const [sortBy, setSortBy] = useState<"days_desc" | "amount_desc" | "vendor_asc">("days_desc");
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Close search suggestions on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const reminderCount = useMemo(() => {
    return invoices.filter((inv) => isWithinReminderWindow(inv.due_date)).length;
  }, [invoices]);

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
  }, [searchQuery, activeVendorFilter, agingFilter, sortBy]);

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

  // Base invoices matching current aging bucket
  const invoicesMatchingAging = useMemo(() => {
    return invoices.filter((inv) => {
      if (agingFilter === "reminder") return isWithinReminderWindow(inv.due_date);
      if (agingFilter === "30") return inv.days_overdue <= 30;
      if (agingFilter === "60") return inv.days_overdue > 30 && inv.days_overdue <= 60;
      if (agingFilter === "90+") return inv.days_overdue > 60;
      return true;
    });
  }, [invoices, agingFilter]);

  // Compute unique vendor suggestions based on the active search query
  const vendorSuggestions = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];

    const map = new Map<string, { count: number; totalAmount: number }>();
    for (const inv of invoicesMatchingAging) {
      const vName = (inv.vendor_name || "").trim();
      if (!vName) continue;

      const matches =
        vName.toLowerCase().includes(q) ||
        (inv.invoice_number && inv.invoice_number.toLowerCase().includes(q));

      if (matches) {
        const existing = map.get(vName);
        if (existing) {
          existing.count += 1;
          existing.totalAmount += inv.amount || 0;
        } else {
          map.set(vName, { count: 1, totalAmount: inv.amount || 0 });
        }
      }
    }

    return Array.from(map.entries())
      .map(([name, data]) => ({
        name,
        count: data.count,
        totalAmount: data.totalAmount,
      }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [invoicesMatchingAging, searchQuery]);

  // Invoices matching search query before activeVendorFilter is applied
  const invoicesMatchingSearch = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return invoicesMatchingAging;
    return invoicesMatchingAging.filter((inv) => {
      return (
        inv.vendor_name.toLowerCase().includes(q) ||
        (inv.invoice_number && inv.invoice_number.toLowerCase().includes(q))
      );
    });
  }, [invoicesMatchingAging, searchQuery]);

  // Final filtered invoices (applying activeVendorFilter if selected, and sorting)
  const filteredInvoices = useMemo(() => {
    return invoicesMatchingSearch
      .filter((inv) => {
        if (activeVendorFilter && inv.vendor_name.trim() !== activeVendorFilter.trim()) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === "days_desc") return b.days_overdue - a.days_overdue;
        if (sortBy === "amount_desc") return b.amount - a.amount;
        if (sortBy === "vendor_asc") return a.vendor_name.localeCompare(b.vendor_name);
        return 0;
      });
  }, [invoicesMatchingSearch, activeVendorFilter, sortBy]);

  // Pagination Calculations (50 rows per page)
  const totalPages = Math.ceil(filteredInvoices.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredInvoices.length);
  const paginatedInvoices = filteredInvoices.slice(startIndex, endIndex);

  // Generate page numbers array (with ellipsis for clean navigation like Image 3)
  const getPageNumbers = (current: number, total: number): (number | string)[] => {
    if (total <= 6) return Array.from({ length: total }, (_, i) => i + 1);
    if (current <= 3) return [1, 2, 3, 4, "...", total];
    if (current >= total - 2) return [1, "...", total - 3, total - 2, total - 1, total];
    return [1, "...", current - 1, current, current + 1, "...", total];
  };
  const pageNumbers = getPageNumbers(currentPage, totalPages);

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
  // Ordered: 1. Consultant (extracted after "-"), 2. Invoice, 3. Amount Due, 4. Due Date, 5. Aging (no "days")
  // Vivid blue header #0070C0, bold white text, clean black 1px borders
  // ==========================================
  const copyFormattedForZoho = async (targetInvoices: InvoiceRecord[]) => {
    if (targetInvoices.length === 0) return;

    const headers = ["Consultant", "Invoice", "Amount Due", "Due Date", "Aging"];

    const getRowValues = (inv: InvoiceRecord) => {
      // Extract consultant name: only the part after "-" if present, otherwise trimmed vendor name
      let consultant = (inv.vendor_name || "—").trim();
      if (consultant.includes("-")) {
        const parts = consultant.split("-");
        const afterHyphen = parts.slice(1).join("-").trim();
        if (afterHyphen) {
          consultant = afterHyphen;
        }
      }

      return [
        consultant,
        inv.invoice_number || "—",
        `$${inv.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        formatDateMMDDYYYY(inv.due_date),
        inv.days_overdue ?? 0, // Clean number only, without "days"
      ];
    };

    // Generate rich HTML table matching Zoho Mail specs
    const headerHtml = headers
      .map(
        (h, i) =>
          `<th style="background-color: #0070C0; color: #FFFFFF; font-weight: bold; font-family: Calibri, Arial, sans-serif; font-size: 13px; border: 1px solid #000000; padding: 7px 14px; text-align: ${
            i === 0 ? "left" : i === 2 ? "right" : "center"
          }; vertical-align: middle; white-space: nowrap;">${h}</th>`
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
              }; font-weight: ${i === 2 || i === 4 ? "bold" : "normal"}; vertical-align: middle; white-space: nowrap;">${val}</td>`
          )
          .join("");
        return `<tr>${cellsHtml}</tr>`;
      })
      .join("");

    // Self-contained block container with zero phantom margin and a safe trailing break
    // This prevents Zoho Mail from injecting massive empty paragraphs, and prevents Backspace from merging text into the last <td>
    const fullHtml = `<div style="margin: 0; padding: 0;"><table cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #000000; font-family: Calibri, Arial, sans-serif; font-size: 13px; margin: 0; mso-table-lspace: 0pt; mso-table-rspace: 0pt;"><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></div><div style="font-family: Calibri, Arial, sans-serif; font-size: 13px; line-height: 1.2; margin: 2px 0 0 0; padding: 0;"><br></div>`;

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
    <div className="flex-1 flex flex-col min-h-0 relative">
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

      {/* Dynamic Header Row (Supports Style 01, 02, 03, 04 live from Design Lab; defaults to Style 02) */}
      {(() => {
        const renderUploadButton = (theme: "blue" | "dark" = "blue") => {
          const isDark = theme === "dark";
          return (
            <div className="flex items-center gap-2 shrink-0">
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

              {/* Desktop Rich Button */}
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
                className={`hidden sm:inline-flex group relative items-center gap-3 px-4 py-2 sm:px-4.5 sm:py-2.5 rounded-xl sm:rounded-2xl transition-all duration-200 cursor-pointer disabled:opacity-50 select-none ${
                  isDragHover
                    ? isDark
                      ? "bg-black text-white shadow-lg ring-4 ring-slate-700/30 scale-[1.02]"
                      : "bg-blue-700 text-white shadow-lg ring-4 ring-blue-500/30 scale-[1.02]"
                    : isDark
                    ? "bg-slate-900 hover:bg-black active:scale-98 text-white shadow-md shadow-slate-900/20 hover:shadow-lg hover:shadow-slate-900/30"
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

              {/* Mobile Compact Button: Saves massive vertical space on phones */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  if (fileInputRef.current) {
                    fileInputRef.current.value = "";
                    fileInputRef.current.click();
                  }
                }}
                className={`sm:hidden inline-flex items-center gap-1.5 px-3 py-2 rounded-xl active:scale-95 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 ${
                  isDark ? "bg-slate-900 hover:bg-black" : "bg-[#2563eb] hover:bg-blue-600"
                }`}
              >
                {isProcessing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
                ) : (
                  <Upload className="w-3.5 h-3.5 text-white" />
                )}
                <span>Upload</span>
              </button>
            </div>
          );
        };

        // Style 01: Architectural Minimal
        if (activeHeaderStyle === "style-01") {
          return (
            <div className="flex flex-row items-center justify-between gap-3 pb-3 sm:pb-5 border-b border-slate-200/60 mb-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <div className="w-1.5 h-6 bg-blue-600 rounded-full" />
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight truncate sm:whitespace-normal">
                    Overdue Invoices
                  </h1>
                  <span className="hidden sm:inline-flex px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                    Active View
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1 pl-4 hidden sm:block">
                  Import spreadsheets (.csv or .xlsx) to analyze overdue aging balances and prepare vendor statements.
                </p>
              </div>
              {renderUploadButton("blue")}
            </div>
          );
        }

        // Style 02: Executive Slate Chassis (Requested Active Style)
        if (activeHeaderStyle === "style-02") {
          return (
            <div className="bg-gradient-to-r from-slate-100/90 via-slate-50/70 to-white border border-slate-200/90 rounded-2xl p-3.5 sm:p-5 flex flex-row items-center justify-between gap-3 mb-4 shadow-2xs">
              <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
                <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-white border border-slate-200/90 flex items-center justify-center shadow-xs shrink-0">
                  <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
                      WORKSPACE // AR LEDGER
                    </span>
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                  <h1 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight truncate">
                    Overdue Invoices
                  </h1>
                  <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
                    Import spreadsheets (.csv or .xlsx) to analyze overdue aging balances and prepare vendor statements.
                  </p>
                </div>
              </div>
              {renderUploadButton("dark")}
            </div>
          );
        }

        // Style 03: Cockpit Flight Deck (Inline Metric Ribbons)
        if (activeHeaderStyle === "style-03") {
          return (
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 sm:pb-5 border-b border-slate-200/60 mb-4">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Overdue Invoices
                  </h1>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border text-rose-600 bg-rose-50 border-rose-200 shadow-2xs">
                      <span className="text-[10px] font-medium opacity-80">Total Overdue:</span>
                      <span>$3,500,238</span>
                    </div>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border text-amber-600 bg-amber-50 border-amber-200 shadow-2xs">
                      <span className="text-[10px] font-medium opacity-80">Past Due:</span>
                      <span>261 Invoices</span>
                    </div>
                    <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border text-blue-600 bg-blue-50 border-blue-200 shadow-2xs">
                      <span className="text-[10px] font-medium opacity-80">Active Vendors:</span>
                      <span>155 Accounts</span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-1 hidden sm:block">
                  Import spreadsheets (.csv or .xlsx) to analyze overdue aging balances and prepare vendor statements.
                </p>
              </div>
              {renderUploadButton("blue")}
            </div>
          );
        }

        // Style 04: Frosted Glass Floating Dock
        return (
          <div className="relative bg-white/90 backdrop-blur-md rounded-2xl border border-slate-200/90 p-3.5 sm:p-5 shadow-xs overflow-hidden flex flex-row items-center justify-between gap-3 mb-4">
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-indigo-500 to-transparent pointer-events-none" />
            <div className="flex items-center gap-3 sm:gap-3.5 min-w-0">
              <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-blue-50 border border-blue-200/80 shadow-2xs flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight truncate">
                    Overdue Invoices
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-bold text-emerald-700 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Live Sync
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5 truncate hidden sm:block">
                  Import spreadsheets (.csv or .xlsx) to analyze overdue aging balances and prepare vendor statements.
                </p>
              </div>
            </div>
            {renderUploadButton("blue")}
          </div>
        );
      })()}

      {/* Main Table Container (Fixed-View Dashboard Architecture) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Table Filters & Search Toolbar */}
        <div className="p-3 sm:p-4 border-b border-slate-200/70 flex flex-col gap-2.5 bg-slate-50/50 rounded-t-2xl">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
            {/* Search Input Container with Dropdown Suggestions */}
            <div className="relative w-full xl:max-w-sm" ref={searchContainerRef}>
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onFocus={() => setIsSearchFocused(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setActiveVendorFilter(null);
                  setIsSearchFocused(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Escape") {
                    setIsSearchFocused(false);
                  }
                }}
                placeholder="Search vendor or invoice number..."
                className="w-full pl-10 pr-9 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-500/15 transition-all shadow-2xs"
              />

              {/* Clear search button */}
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    setActiveVendorFilter(null);
                    setIsSearchFocused(false);
                    setCurrentPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-md hover:bg-slate-100 transition-colors"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Floating Autocomplete Dropdown */}
              {isSearchFocused && vendorSuggestions.length > 0 && (
                <div
                  onMouseDown={(e) => e.preventDefault()}
                  className="absolute left-0 right-0 top-full mt-1.5 z-40 bg-white rounded-xl shadow-xl border border-slate-200 overflow-hidden py-1 max-h-72 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150"
                >
                  <div className="px-3 py-1.5 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/80 border-b border-slate-100">
                    <span>Suggested Vendors ({vendorSuggestions.length})</span>
                    <span className="text-[10px] text-blue-600 font-semibold lowercase">click to filter</span>
                  </div>
                  {vendorSuggestions.map((v) => {
                    const isSelected = activeVendorFilter === v.name;
                    return (
                      <button
                        key={v.name}
                        type="button"
                        onClick={() => {
                          setActiveVendorFilter(isSelected ? null : v.name);
                          setIsSearchFocused(false);
                          setCurrentPage(1);
                        }}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 transition-colors ${
                          isSelected
                            ? "bg-blue-50 text-blue-700 font-bold"
                            : "hover:bg-slate-50 text-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {isSelected ? <Check className="w-3.5 h-3.5" /> : <User className="w-3.5 h-3.5" />}
                          </div>
                          <span className="text-xs truncate">{v.name}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                            {v.count} inv
                          </span>
                          <span className="text-[11px] font-mono font-bold text-slate-700 hidden sm:inline">
                            ${v.totalAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Filter Pills & Secondary Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 w-full xl:w-auto">
              {/* Filter Pills - Horizontally Scrollable on Mobile with Zero Line Breaking */}
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar rounded-xl bg-slate-100 p-1 border border-slate-200/80 text-xs font-semibold shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAgingFilter("all");
                    setActiveVendorFilter(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-xs transition-all shrink-0 ${
                    agingFilter === "all" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  All ({invoices.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAgingFilter("reminder");
                    setActiveVendorFilter(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-xs transition-all shrink-0 flex items-center gap-1.5 ${
                    agingFilter === "reminder"
                      ? "bg-white text-blue-700 shadow-xs font-bold ring-1 ring-blue-500/20"
                      : "text-slate-500 hover:text-slate-900"
                  }`}
                  title="Due within ±4 days of current date (10/30/2026)"
                >
                  <Clock className="w-3 h-3 text-blue-600" />
                  <span>Reminder ({reminderCount})</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAgingFilter("30");
                    setActiveVendorFilter(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-xs transition-all shrink-0 ${
                    agingFilter === "30" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  1-30 Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAgingFilter("60");
                    setActiveVendorFilter(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-xs transition-all shrink-0 ${
                    agingFilter === "60" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  31-60 Days
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAgingFilter("90+");
                    setActiveVendorFilter(null);
                  }}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-xs transition-all shrink-0 ${
                    agingFilter === "90+" ? "bg-white text-slate-900 shadow-xs font-bold" : "text-slate-500 hover:text-slate-900"
                  }`}
                >
                  60+ Days
                </button>
              </div>

              {/* Paired Sort & Select Page Actions - 50/50 side-by-side on mobile, natural on desktop */}
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                {/* Sort Dropdown */}
                <div className="relative flex-1 sm:flex-initial">
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="w-full sm:w-auto h-9 pl-3 pr-8 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:border-blue-600 transition-colors shadow-2xs appearance-none cursor-pointer"
                  >
                    <option value="days_desc">Sort: Most Overdue</option>
                    <option value="amount_desc">Sort: Highest Amount</option>
                    <option value="vendor_asc">Sort: Vendor (A-Z)</option>
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>

                {/* Select Page Toggle */}
                {paginatedInvoices.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectCurrentPage}
                    className="flex-1 sm:flex-initial h-9 px-3 bg-white hover:bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors shadow-2xs flex items-center justify-center whitespace-nowrap"
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
          </div>

          {/* Suggested Vendor Filter Chips Strip (Below Search Row) */}
          {vendorSuggestions.length > 1 && searchQuery.trim().length > 0 && (
            <div className="flex items-center gap-2 pt-2 border-t border-slate-200/60 overflow-x-auto no-scrollbar animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center gap-1 text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                <Sparkles className="w-3 h-3 text-blue-600 shrink-0" />
                <span>Suggested Vendors ({vendorSuggestions.length}):</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setActiveVendorFilter(null);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0 ${
                    activeVendorFilter === null
                      ? "bg-slate-900 text-white shadow-2xs font-bold"
                      : "bg-white hover:bg-slate-100 text-slate-600 border border-slate-200/80 shadow-2xs"
                  }`}
                >
                  All ({invoicesMatchingSearch.length})
                </button>

                {vendorSuggestions.map((v) => {
                  const isSelected = activeVendorFilter === v.name;
                  return (
                    <button
                      key={v.name}
                      type="button"
                      onClick={() => {
                        setActiveVendorFilter(isSelected ? null : v.name);
                        setCurrentPage(1);
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 ${
                        isSelected
                          ? "bg-blue-600 text-white shadow-xs font-bold ring-2 ring-blue-500/25"
                          : "bg-white hover:bg-blue-50/70 text-slate-700 hover:text-blue-700 border border-slate-200/80 shadow-2xs"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                      <span>{v.name}</span>
                      <span
                        className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                          isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {v.count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
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
          /* Scrollable Table View (Internal scroll with flex-1 height: zero page scrolling down, zero content peeking above header) */
          <div className="flex-1 overflow-y-auto overflow-x-auto min-h-0">
            {/* Desktop Full Table View (>= md) */}
            <div className="hidden md:block">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/80 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="sticky top-0 z-10 py-3.5 px-5 bg-slate-50 border-b border-slate-200/80 shadow-2xs">Vendor</th>
                    <th className="sticky top-0 z-10 py-3.5 px-4 bg-slate-50 border-b border-slate-200/80 shadow-2xs font-mono">Invoice</th>
                    <th className="sticky top-0 z-10 py-3.5 px-4 text-right bg-slate-50 border-b border-slate-200/80 shadow-2xs">Amount Due</th>
                    <th className="sticky top-0 z-10 py-3.5 px-4 text-center bg-slate-50 border-b border-slate-200/80 shadow-2xs">Due Date</th>
                    <th className="sticky top-0 z-10 py-3.5 px-4 text-center bg-slate-50 border-b border-slate-200/80 shadow-2xs">Aging</th>
                    <th className="sticky top-0 z-10 py-3.5 px-5 text-center bg-slate-50 border-b border-slate-200/80 shadow-2xs">Status</th>
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
              <div className="sticky top-0 z-10 bg-slate-50/95 backdrop-blur-xs px-4 py-2.5 border-b border-slate-200/80 shadow-2xs flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
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
          </div>
        )}

        {/* Table Footer with Pinned Pagination Controls (Always visible, exactly like Image 3) */}
        {filteredInvoices.length > 0 && (
          <div className="p-3 sm:p-4 border-t border-slate-200/70 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500 rounded-b-2xl shrink-0">
            <div className="flex items-center gap-2">
              <span>
                Showing <strong>{startIndex + 1}</strong>–<strong>{endIndex}</strong> of <strong>{filteredInvoices.length}</strong> records
                {selectedIds.size > 0 && (
                  <span className="ml-2 font-semibold text-blue-600">
                    ({selectedIds.size} selected)
                  </span>
                )}
              </span>
            </div>

            {/* Image-3 Style Professional Numbered Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1 self-center sm:self-auto flex-wrap justify-center">
                {/* First Page */}
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(1)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold shadow-2xs transition-colors"
                  title="First Page"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">First</span>
                </button>

                {/* Previous Page */}
                <button
                  type="button"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold shadow-2xs transition-colors"
                  title="Previous Page"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Previous</span>
                </button>

                {/* Numbered Page Buttons */}
                <div className="flex items-center gap-1 mx-0.5">
                  {pageNumbers.map((pageNum, pIdx) => {
                    if (typeof pageNum !== "number") {
                      return (
                        <span key={`ellipsis-${pIdx}`} className="px-1.5 py-1 text-slate-400 font-bold select-none text-xs">
                          ...
                        </span>
                      );
                    }
                    const isActive = currentPage === pageNum;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setCurrentPage(pageNum)}
                        className={`min-w-8 h-8 px-2 rounded-lg text-xs font-bold transition-all shadow-2xs ${
                          isActive
                            ? "bg-[#2563eb] text-white shadow-xs scale-105"
                            : "bg-white hover:bg-slate-100 text-slate-700 border border-slate-200/80"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                {/* Next Page */}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold shadow-2xs transition-colors"
                  title="Next Page"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* Last Page */}
                <button
                  type="button"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold shadow-2xs transition-colors"
                  title="Last Page"
                >
                  <span className="hidden sm:inline">Last</span>
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Floating Bottom Action Bar when Rows are Selected */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-24px)] max-w-md sm:w-auto bg-[#0c1427]/95 backdrop-blur-md text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl shadow-2xl border border-slate-700/80 flex items-center justify-between sm:justify-start gap-2 sm:gap-3.5 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/60 text-xs font-semibold shrink-0">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse ring-2 ring-blue-400/20"></span>
            <span className="text-white font-bold">{selectedIds.size}</span>
            <span className="text-slate-300 text-[11px] hidden xs:inline">{selectedIds.size === 1 ? "row" : "rows"}</span>
          </div>

          <div className="hidden sm:block h-4 w-px bg-slate-700/80"></div>

          <button
            type="button"
            onClick={() => copyFormattedForZoho(selectedRowsList)}
            className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold text-xs shadow-md shadow-blue-900/30 transition-all cursor-pointer whitespace-nowrap shrink-0"
          >
            <Copy className="w-3.5 h-3.5 shrink-0" />
            <span>Copy for Zoho Mail</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedIds(new Set())}
            className="px-2.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            title="Clear selection"
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
