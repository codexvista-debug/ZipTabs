"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  Trash2,
  Search,
  AlertCircle,
  Clock,
  DollarSign,
  Users,
  CheckCircle2,
  Loader2,
  RefreshCw,
  FileDown,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";

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

export function InvoicesView() {
  const [invoices, setInvoices] = useState<InvoiceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState("");
  const [agingFilter, setAgingFilter] = useState<"all" | "30" | "60" | "90+">("all");
  const [sortBy, setSortBy] = useState<"days_desc" | "amount_desc" | "vendor_asc">("days_desc");

  // Selection State (for Excel-like multi-row select & copy)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [copiedNotification, setCopiedNotification] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        setInvoices(data);
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

  // Helper to extract clean numeric amount
  const parseAmount = (val: any): number => {
    if (typeof val === "number") return val;
    if (!val) return 0;
    const str = String(val).replace(/[^0-9.-]+/g, "");
    const parsed = parseFloat(str);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Helper to extract clean days overdue
  const parseDays = (val: any, dueDateVal: any): number => {
    if (typeof val === "number") return Math.max(0, Math.floor(val));
    if (val && !isNaN(parseInt(val, 10))) {
      return Math.max(0, parseInt(val, 10));
    }
    if (dueDateVal) {
      const parsedDate = new Date(dueDateVal);
      if (!isNaN(parsedDate.getTime())) {
        const diffMs = Date.now() - parsedDate.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return Math.max(0, diffDays);
      }
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
      // 1. Exact match (stripped of spaces and punctuation)
      for (const pref of priorityList) {
        const prefNorm = pref.toLowerCase().replace(/[^a-z0-9]/g, "");
        const found = keys.find(
          (k) => k.toLowerCase().replace(/[^a-z0-9]/g, "") === prefNorm
        );
        if (found && row[found] !== undefined && row[found] !== null && String(row[found]).trim() !== "") {
          return row[found];
        }
      }
      // 2. Substring match
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

  // Purge all data manually
  const handlePurgeAll = async () => {
    if (!window.confirm("Are you sure you want to delete all invoice data? This cannot be undone.")) {
      return;
    }

    setIsProcessing(true);
    try {
      if (supabase) {
        await supabase
          .from("invoices")
          .delete()
          .neq("id", "00000000-0000-0000-0000-000000000000");
      }
      setInvoices([]);
      setSelectedIds(new Set());
      setStatusMessage({
        type: "success",
        text: "All invoice records have been purged from database.",
      });
    } catch (err: any) {
      setStatusMessage({
        type: "error",
        text: "Failed to purge database records.",
      });
    } finally {
      setIsProcessing(false);
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

  // Calculate Metrics
  const totalOverdueAmount = invoices.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  const totalOverdueCount = invoices.filter((inv) => inv.days_overdue > 0).length;
  const uniqueVendorsCount = new Set(invoices.map((inv) => inv.vendor_name.toLowerCase())).size;
  const criticalOverdueCount = invoices.filter((inv) => inv.days_overdue > 60).length;

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

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredInvoices.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredInvoices.map((inv) => inv.id || inv.invoice_number || inv.vendor_name)));
    }
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

  // Export current view to CSV
  const exportToCSV = () => {
    if (invoices.length === 0) return;
    const csvData = filteredInvoices.map((inv) => ({
      "Vendor Name": inv.vendor_name,
      "Invoice #": inv.invoice_number,
      Amount: inv.amount,
      "Due Date": formatDateMMDDYYYY(inv.due_date),
      Aging: inv.days_overdue,
      Status: inv.status,
      Notes: inv.notes,
    }));

    const csvString = Papa.unparse(csvData);
    const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `overdue_invoices_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedRowsList = invoices.filter((inv) =>
    selectedIds.has(inv.id || inv.invoice_number || inv.vendor_name)
  );

  return (
    <div className="space-y-6 relative pb-16">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-slate-200/60">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Overdue Invoices
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Import spreadsheets (.csv or .xlsx) to analyze overdue aging balances and prepare vendor statements.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <input
            type="file"
            ref={fileInputRef}
            accept=".csv, .xlsx, .xls"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />

          <button
            type="button"
            disabled={isProcessing}
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563eb] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all cursor-pointer disabled:opacity-50"
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>{isProcessing ? "Importing..." : "Import File (.csv / .xlsx)"}</span>
          </button>

          {invoices.length > 0 && (
            <>
              <button
                type="button"
                onClick={exportToCSV}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-50 transition-colors shadow-xs"
              >
                <FileDown className="w-4 h-4 text-slate-500" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={handlePurgeAll}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition-colors shadow-xs"
              >
                <Trash2 className="w-4 h-4 text-rose-500" />
                <span>Purge Table</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={loadInvoices}
            title="Refresh database records"
            className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Copied Success Toast Notice */}
      {copiedNotification && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-xl bg-slate-900 text-white text-xs font-medium shadow-2xl flex items-center gap-3 border border-slate-800 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <div>
            <div className="font-bold text-white">{copiedNotification}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Ready to paste directly into Zoho Mail with blue headers and borders.
            </div>
          </div>
        </div>
      )}

      {/* Status Notice Banner */}
      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center justify-between gap-3 ${
            statusMessage.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-xs font-bold opacity-60 hover:opacity-100"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Total Overdue</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight mt-2">
            ${totalOverdueAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Across {invoices.length} total entries
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Past Due Invoices</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight mt-2">
            {totalOverdueCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Overdue items requiring action
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Unique Vendors</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight mt-2">
            {uniqueVendorsCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Active vendor accounts
          </div>
        </div>

        <div className="bg-white rounded-xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Critical (60+ Days)</span>
            <AlertCircle className="w-4 h-4 text-rose-500" />
          </div>
          <div className={`text-2xl font-black tracking-tight mt-2 ${criticalOverdueCount > 0 ? "text-rose-600" : "text-emerald-600"}`}>
            {criticalOverdueCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            High priority collections
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {/* Table Filters & Search Toolbar */}
        <div className="p-4 border-b border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50">
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

          {/* Filter Pills */}
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  {/* Select All Checkbox */}
                  <th className="py-3.5 px-4 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.size > 0 && selectedIds.size === filteredInvoices.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      title="Select all rows"
                    />
                  </th>
                  <th className="py-3.5 px-4">Vendor</th>
                  <th className="py-3.5 px-4">Invoice</th>
                  <th className="py-3.5 px-4 text-right">Amount Due</th>
                  <th className="py-3.5 px-4 text-center">Due Date</th>
                  <th className="py-3.5 px-4 text-center">Aging</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center w-20">Copy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredInvoices.map((inv, idx) => {
                  const rowId = inv.id || inv.invoice_number || inv.vendor_name;
                  const isSelected = selectedIds.has(rowId);
                  const isHighAlert = inv.days_overdue > 60;
                  const isMediumAlert = inv.days_overdue > 30 && inv.days_overdue <= 60;

                  return (
                    <tr
                      key={rowId || idx}
                      onClick={() => toggleSelectRow(rowId)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? "bg-blue-50/70 hover:bg-blue-100/60"
                          : "hover:bg-slate-50/80"
                      }`}
                    >
                      {/* Checkbox */}
                      <td
                        className="py-3.5 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(rowId)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* 1. Vendor */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {inv.vendor_name}
                        </div>
                        {inv.notes && (
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">
                            {inv.notes}
                          </div>
                        )}
                      </td>

                      {/* 2. Invoice */}
                      <td className="py-3.5 px-4 font-mono text-slate-600">
                        {inv.invoice_number || "—"}
                      </td>

                      {/* 3. Amount Due */}
                      <td className="py-3.5 px-4 text-right font-black text-slate-900">
                        ${inv.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* 4. Due Date */}
                      <td className="py-3.5 px-4 text-center text-slate-600 font-mono">
                        {formatDateMMDDYYYY(inv.due_date)}
                      </td>

                      {/* 5. Aging (Number only, no 'days') */}
                      <td className="py-3.5 px-4 text-center">
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
                      <td className="py-3.5 px-4 text-center">
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

                      {/* Quick 1-Click Copy Row for Zoho Mail */}
                      <td
                        className="py-3.5 px-4 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => copyFormattedForZoho([inv])}
                          title="Copy this row formatted for Zoho Mail"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Footer */}
        {filteredInvoices.length > 0 && (
          <div className="p-4 border-t border-slate-200/70 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500">
            <span>
              Showing <strong>{filteredInvoices.length}</strong> of <strong>{invoices.length}</strong> records
              {selectedIds.size > 0 && (
                <span className="ml-2 font-semibold text-blue-600">
                  ({selectedIds.size} selected)
                </span>
              )}
            </span>
            <span className="text-[11px] text-slate-400">
              💡 Tip: Select rows and press <kbd className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">Ctrl+C</kbd> to copy for Zoho Mail
            </span>
          </div>
        )}
      </div>

      {/* Floating Bottom Action Bar when Rows are Selected */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 duration-200">
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
