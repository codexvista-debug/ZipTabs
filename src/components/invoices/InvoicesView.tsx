"use client";

import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import {
  Upload,
  FileSpreadsheet,
  Trash2,
  Download,
  Search,
  Filter,
  AlertCircle,
  Clock,
  DollarSign,
  Users,
  CheckCircle2,
  Loader2,
  RefreshCw,
  FileDown,
  ArrowUpDown,
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
    // Calculate from due date if available
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

  // Intelligently map arbitrary columns to our standardized schema
  const normalizeRow = (row: Record<string, any>): InvoiceRecord | null => {
    const keys = Object.keys(row);
    if (keys.length === 0) return null;

    const findVal = (patterns: string[]) => {
      const matchedKey = keys.find((k) =>
        patterns.some((p) => k.toLowerCase().replace(/[^a-z0-9]/g, "").includes(p))
      );
      return matchedKey ? row[matchedKey] : undefined;
    };

    const vendor =
      findVal(["vendor", "client", "customer", "company", "supplier", "payee", "name"]) ||
      row[keys[0]] ||
      "Unknown Vendor";

    const invoiceNum =
      findVal(["invoice", "inv", "bill", "number", "num", "id", "ref"]) || "";

    const rawAmount = findVal(["amount", "balance", "open", "due", "total", "net", "payable", "sum"]);
    const amount = parseAmount(rawAmount);

    const rawDueDate = findVal(["duedate", "due", "paymentdue", "date", "expiry"]);
    const dueDateStr = rawDueDate ? String(rawDueDate).trim() : "";

    const rawDays = findVal(["overdue", "aging", "days", "pastdue"]);
    const daysOverdue = parseDays(rawDays, dueDateStr);

    const notes = findVal(["notes", "memo", "description", "remarks"]) || "";

    return {
      vendor_name: String(vendor).trim(),
      invoice_number: String(invoiceNum).trim(),
      amount: amount,
      due_date: dueDateStr,
      days_overdue: daysOverdue,
      status: daysOverdue > 0 ? "Overdue" : "Pending",
      notes: String(notes).trim(),
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
        // Parse CSV
        const text = await file.text();
        const result = Papa.parse(text, { header: true, skipEmptyLines: true });
        parsedRows = result.data as Record<string, any>[];
      } else if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        // Parse Excel
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

      // Map rows
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
      const { error: purgeError } = await supabase
        .from("invoices")
        .delete()
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (purgeError) {
        console.error("Purge error:", purgeError);
      }

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
        }));

        const { error: insertError } = await supabase.from("invoices").insert(batch);
        if (insertError) {
          throw new Error(`Insert failed: ${insertError.message}`);
        }
      }

      // 3. Reload from Supabase
      await loadInvoices();
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

  // Export current view to CSV
  const exportToCSV = () => {
    if (invoices.length === 0) return;
    const csvData = filteredInvoices.map((inv) => ({
      "Vendor Name": inv.vendor_name,
      "Invoice #": inv.invoice_number,
      Amount: inv.amount,
      "Due Date": inv.due_date,
      "Days Overdue": inv.days_overdue,
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

  // Filter & Sort Logic
  const filteredInvoices = invoices
    .filter((inv) => {
      // Search
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        inv.vendor_name.toLowerCase().includes(q) ||
        (inv.invoice_number && inv.invoice_number.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      // Aging filter
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

  return (
    <div className="space-y-6">
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
                className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#2563eb] hover:bg-blue-600 text-white font-bold text-xs shadow-md shadow-blue-500/25 transition-all"
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
                  <th className="py-3.5 px-5">Vendor / Payee</th>
                  <th className="py-3.5 px-5">Invoice #</th>
                  <th className="py-3.5 px-5">Due Date</th>
                  <th className="py-3.5 px-5">Overdue Days</th>
                  <th className="py-3.5 px-5 text-right">Amount Due</th>
                  <th className="py-3.5 px-5 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {filteredInvoices.map((inv, idx) => {
                  const isHighAlert = inv.days_overdue > 60;
                  const isMediumAlert = inv.days_overdue > 30 && inv.days_overdue <= 60;

                  return (
                    <tr
                      key={inv.id || idx}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* Vendor */}
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-slate-900">
                          {inv.vendor_name}
                        </div>
                        {inv.notes && (
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate max-w-xs">
                            {inv.notes}
                          </div>
                        )}
                      </td>

                      {/* Invoice # */}
                      <td className="py-3.5 px-5 font-mono text-slate-600">
                        {inv.invoice_number || "—"}
                      </td>

                      {/* Due Date */}
                      <td className="py-3.5 px-5 text-slate-600">
                        {inv.due_date || "—"}
                      </td>

                      {/* Days Overdue Badge */}
                      <td className="py-3.5 px-5">
                        {inv.days_overdue > 0 ? (
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              isHighAlert
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : isMediumAlert
                                ? "bg-amber-100 text-amber-800 border border-amber-200"
                                : "bg-orange-50 text-orange-700 border border-orange-200"
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>{inv.days_overdue} days</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">Current</span>
                        )}
                      </td>

                      {/* Amount Due */}
                      <td className="py-3.5 px-5 text-right font-black text-slate-900">
                        ${inv.amount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-5 text-center">
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
        )}

        {/* Table Footer */}
        {filteredInvoices.length > 0 && (
          <div className="p-4 border-t border-slate-200/70 bg-slate-50/50 flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing <strong>{filteredInvoices.length}</strong> of <strong>{invoices.length}</strong> records
            </span>
            <span className="text-[11px] text-slate-400">
              Synced with Supabase database
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
